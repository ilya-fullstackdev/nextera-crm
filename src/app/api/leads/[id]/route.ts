import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiLeadsAccess, requireApiRole, ApiAuthError } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";
import { revalidateCrm } from "@/lib/revalidate";
import { applyAutoStatus } from "@/lib/lead-progression";
import { LEAD_STATUS_LABELS } from "@/lib/labels";

async function loadLeadOrThrow(id: string) {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) throw new ApiAuthError(404, "Лид не найден");
  return lead;
}

function canEdit(actorId: string, actorRole: string, lead: { ownerId: string }) {
  return actorRole === "DIRECTOR" || lead.ownerId === actorId;
}

const statusSchema = z.enum([
  "NEW",
  "SEARCHING_DM",
  "FIRST_CONTACT",
  "DM_FOUND",
  "QUALIFICATION",
  "HANDED_TO_MANAGER",
  "NEGOTIATION",
  "PROPOSAL_SENT",
  "DEAL",
  "REJECTED",
  "CALLBACK_LATER",
]);

const updateSchema = z.object({
  status: statusSchema.optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  source: z
    .enum(["YANDEX_MAPS", "GOOGLE_MAPS", "INSTAGRAM", "TIKTOK", "TELEGRAM", "WEBSITE", "REFERRAL", "MANUAL_SEARCH", "OTHER"])
    .optional(),
  ownerId: z.string().optional(),
  dmStatus: z.enum(["NOT_FOUND", "FOUND", "PARTICIPATES", "MULTIPLE"]).optional(),
  needLevel: z.enum(["NONE", "POTENTIAL", "CONFIRMED"]).optional(),
  needDescription: z.string().optional(),
  currentWebsite: z.string().optional(),
  problem: z.string().optional(),
  desiredResult: z.string().optional(),
  timeline: z.enum(["NOW", "ONE_TO_THREE_MONTHS", "THREE_TO_SIX_MONTHS", "UNDEFINED"]).optional(),
  budgetStatus: z.enum(["UNKNOWN", "ESTIMATE", "DEFINED", "NONE"]).optional(),
  budgetComment: z.string().optional(),
  currentContractor: z.string().optional(),
  interestLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  nextContactAt: z.string().nullable().optional(),
  companyName: z.string().optional(),
  companyNiche: z.string().optional(),
  companyCity: z.string().optional(),
  companyWebsite: z.string().optional(),
  contactFirstName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactPosition: z.string().optional(),
  contactTelegram: z.string().optional(),
  contactEmail: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireApiLeadsAccess();
    const { id } = await params;
    const lead = await loadLeadOrThrow(id);

    if (!canEdit(actor.id, actor.role, lead)) {
      return NextResponse.json({ error: "Недостаточно прав для редактирования этого лида" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
    }
    const data = parsed.data;

    if (data.status === "REJECTED") {
      return NextResponse.json({ error: "Используйте форму отказа для этого статуса" }, { status: 400 });
    }
    if (data.status === "HANDED_TO_MANAGER") {
      return NextResponse.json({ error: "Используйте форму передачи лида" }, { status: 400 });
    }
    if (data.ownerId && actor.role !== "DIRECTOR") {
      return NextResponse.json({ error: "Изменить ответственного может только руководитель" }, { status: 403 });
    }

    const {
      companyName,
      companyNiche,
      companyCity,
      companyWebsite,
      contactFirstName,
      contactPhone,
      contactPosition,
      contactTelegram,
      contactEmail,
      ...leadFields
    } = data;

    if (companyName || companyNiche !== undefined || companyCity !== undefined || companyWebsite !== undefined) {
      await prisma.company.update({
        where: { id: lead.companyId },
        data: {
          ...(companyName ? { name: companyName } : {}),
          ...(companyNiche !== undefined ? { niche: companyNiche } : {}),
          ...(companyCity !== undefined ? { city: companyCity } : {}),
          ...(companyWebsite !== undefined ? { website: companyWebsite } : {}),
        },
      });
    }

    // Контакт правится в той же форме, что и компания.
    const contactData = {
      ...(contactFirstName !== undefined ? { firstName: contactFirstName.trim() } : {}),
      ...(contactPhone !== undefined ? { phone: contactPhone } : {}),
      ...(contactPosition !== undefined ? { position: contactPosition } : {}),
      ...(contactTelegram !== undefined ? { telegram: contactTelegram } : {}),
      ...(contactEmail !== undefined ? { email: contactEmail } : {}),
    };
    let newContactId: string | undefined;
    if (Object.keys(contactData).length > 0) {
      if (lead.contactId) {
        await prisma.contact.update({ where: { id: lead.contactId }, data: contactData });
      } else if (contactFirstName?.trim() || contactPhone?.trim()) {
        const created = await prisma.contact.create({
          data: { firstName: "", ...contactData, companyId: lead.companyId },
        });
        newContactId = created.id;
      }
    }

    const updateData: Record<string, unknown> = { ...leadFields };
    if (newContactId) updateData.contactId = newContactId;
    if (data.nextContactAt !== undefined) {
      updateData.nextContactAt = data.nextContactAt ? new Date(data.nextContactAt) : null;
    }

    const updated = await prisma.lead.update({ where: { id }, data: updateData });

    if (data.status && data.status !== lead.status) {
      await prisma.leadActivity.create({
        data: {
          leadId: id,
          userId: actor.id,
          type: "STATUS_CHANGE",
          comment: `Статус изменён: ${LEAD_STATUS_LABELS[lead.status]} → ${LEAD_STATUS_LABELS[updated.status]}`,
          metadata: { fromStatus: lead.status, toStatus: updated.status },
        },
      });
      await logAudit({
        actor,
        action: "UPDATE_LEAD_STATUS",
        entityType: "Lead",
        entityId: id,
        oldValue: { status: LEAD_STATUS_LABELS[lead.status] },
        newValue: { status: LEAD_STATUS_LABELS[updated.status] },
      });
    }

    // Если статус не выставили руками — пересчитываем его по заполненным данным.
    const autoStatus = data.status ? null : await applyAutoStatus(id, actor);

    revalidateCrm();
    return NextResponse.json({ lead: updated, autoStatus });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireApiRole(["DIRECTOR"]);
    const { id } = await params;
    const lead = await prisma.lead.findUnique({ where: { id }, include: { company: true } });
    if (!lead) {
      return NextResponse.json({ error: "Лид не найден" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.leadActivity.deleteMany({ where: { leadId: id } }),
      prisma.task.deleteMany({ where: { leadId: id } }),
      prisma.leadFile.deleteMany({ where: { leadId: id } }),
      prisma.leadHandover.deleteMany({ where: { leadId: id } }),
      prisma.lead.update({ where: { id }, data: { decisionMakers: { set: [] } } }),
      prisma.lead.delete({ where: { id } }),
    ]);

    await logAudit({
      actor,
      action: "DELETE_LEAD",
      entityType: "Lead",
      entityId: id,
      oldValue: { company: lead.company.name },
    });

    // Лид пропадает сразу из всех вкладок CRM, а не только из текущей.
    revalidateCrm();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
