import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiLeadsAccess, ApiAuthError } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";
import { revalidateCrm } from "@/lib/revalidate";
import { fullName } from "@/lib/auth/current-user";
import { canReceiveHandover } from "@/lib/permissions";

const schema = z.object({
  toUserId: z.string().min(1, "Выберите, кому передать лид"),
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
    const lead = await prisma.lead.findUnique({ where: { id } });
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

    const toUser = await prisma.user.findUnique({ where: { id: data.toUserId } });
    // Лид принимает руководитель.
    if (!toUser || toUser.deletedAt || toUser.status !== "ACTIVE" || !canReceiveHandover(toUser.role)) {
      return NextResponse.json({ error: "Выбранный сотрудник недоступен" }, { status: 400 });
    }
    if (toUser.id === actor.id) {
      return NextResponse.json({ error: "Нельзя передать лид самому себе" }, { status: 400 });
    }

    const [, , updatedLead] = await prisma.$transaction([
      prisma.leadHandover.create({
        data: {
          leadId: id,
          fromUserId: actor.id,
          toUserId: toUser.id,
          dmInfo: data.dmInfo,
          needSummary: data.needSummary,
          situation: data.situation,
          problem: data.problem,
          desiredResult: data.desiredResult,
          timeline: data.timeline,
          budget: data.budget,
          discussed: data.discussed,
          objections: data.objections,
          nextStep: data.nextStep,
        },
      }),
      prisma.leadActivity.create({
        data: {
          leadId: id,
          userId: actor.id,
          type: "HANDOVER",
          comment: `${fullName(actor)} передал лид ${fullName(toUser)}`,
          metadata: { fromUserId: actor.id, toUserId: toUser.id },
        },
      }),
      prisma.lead.update({
        where: { id },
        data: { ownerId: toUser.id, status: "HANDED_TO_MANAGER", handedToManagerAt: new Date() },
      }),
    ]);

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
    await prisma.task.create({
      data: {
        leadId: id,
        title: "Связаться с переданным клиентом",
        type: "CALL",
        dueAt: dueDate,
        assigneeId: toUser.id,
        createdById: actor.id,
      },
    });

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
