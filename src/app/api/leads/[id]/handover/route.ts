import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiLeadsAccess, ApiAuthError } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";
import { revalidateCrm } from "@/lib/revalidate";
import { fullName } from "@/lib/auth/current-user";
import { canReceiveHandover } from "@/lib/permissions";
import { BUDGET_LABELS, NEED_LEVEL_LABELS, TIMELINE_LABELS } from "@/lib/labels";

function tomorrowMorning() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d;
}

const schema = z.object({
  // Если не указан — лид уходит единственному руководителю.
  toUserId: z.string().optional(),
  comment: z.string().optional(),
  dmInfo: z.string().optional(),
  needSummary: z.string().optional(),
  situation: z.string().optional(),
  problem: z.string().optional(),
  desiredResult: z.string().optional(),
  timeline: z.string().optional(),
  budget: z.string().optional(),
  discussed: z.string().optional(),
  objections: z.string().optional(),
  nextStep: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireApiLeadsAccess();
    const { id } = await params;
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        contact: true,
        activities: { where: { type: "CALL" }, orderBy: { createdAt: "desc" }, take: 5 },
      },
    });
    if (!lead) {
      return NextResponse.json({ error: "Лид не найден" }, { status: 404 });
    }
    if (actor.role !== "DIRECTOR" && lead.ownerId !== actor.id) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Некорректные данные" }, { status: 400 });
    }
    const data = parsed.data;

    const toUser = data.toUserId
      ? await prisma.user.findUnique({ where: { id: data.toUserId } })
      : await prisma.user.findFirst({
          where: { role: "DIRECTOR", status: "ACTIVE", deletedAt: null, id: { not: actor.id } },
          orderBy: { createdAt: "asc" },
        });
    // Лид принимает руководитель.
    if (!toUser || toUser.deletedAt || toUser.status !== "ACTIVE" || !canReceiveHandover(toUser.role)) {
      return NextResponse.json({ error: "Выбранный сотрудник недоступен" }, { status: 400 });
    }
    if (toUser.id === actor.id) {
      return NextResponse.json({ error: "Нельзя передать лид самому себе" }, { status: 400 });
    }

    // Брифинг собирается из карточки сам: оператору достаточно одного комментария.
    const brief = {
      dmInfo:
        data.dmInfo ??
        (lead.contact
          ? [`${lead.contact.firstName} ${lead.contact.lastName ?? ""}`.trim(), lead.contact.position, lead.contact.phone]
              .filter(Boolean)
              .join(", ")
          : undefined),
      needSummary: data.needSummary ?? (lead.needDescription || NEED_LEVEL_LABELS[lead.needLevel]),
      situation: data.situation ?? (lead.currentWebsite ? `Текущий сайт: ${lead.currentWebsite}` : undefined),
      problem: data.problem ?? lead.problem ?? undefined,
      desiredResult: data.desiredResult ?? lead.desiredResult ?? undefined,
      timeline: data.timeline ?? TIMELINE_LABELS[lead.timeline],
      budget: data.budget ?? `${BUDGET_LABELS[lead.budgetStatus]}${lead.budgetComment ? ". " + lead.budgetComment : ""}`,
      discussed:
        data.discussed ??
        (lead.activities
          .map((a) => a.comment)
          .filter(Boolean)
          .join("\n") || undefined),
      objections: data.objections,
      nextStep: data.nextStep ?? data.comment,
    };

    const [, , updatedLead] = await prisma.$transaction([
      prisma.leadHandover.create({
        data: {
          leadId: id,
          fromUserId: actor.id,
          toUserId: toUser.id,
          ...brief,
        },
      }),
      prisma.leadActivity.create({
        data: {
          leadId: id,
          userId: actor.id,
          type: "HANDOVER",
          comment: `${fullName(actor)} передал лид ${fullName(toUser)}${data.comment ? `. ${data.comment}` : ""}`,
          metadata: { fromUserId: actor.id, toUserId: toUser.id },
        },
      }),
      prisma.lead.update({
        where: { id },
        // Лид встаёт в очередь звонков руководителя на завтрашнее утро.
        data: { ownerId: toUser.id, status: "HANDED_TO_MANAGER", handedToManagerAt: new Date(), nextContactAt: tomorrowMorning() },
      }),
    ]);

    await logAudit({
      actor,
      action: "HANDOVER_LEAD",
      entityType: "Lead",
      entityId: id,
      newValue: { toUser: fullName(toUser) },
    });

    revalidateCrm();
    return NextResponse.json({ lead: updatedLead });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
