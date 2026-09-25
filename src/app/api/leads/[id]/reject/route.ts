import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiLeadsAccess, ApiAuthError } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";
import { revalidateCrm } from "@/lib/revalidate";
import { REJECTION_REASON_LABELS } from "@/lib/labels";

const schema = z.object({
  reason: z.enum([
    "NO_NEED",
    "HAS_CONTRACTOR",
    "RECENT_WEBSITE",
    "RECENT_REDESIGN",
    "EXPENSIVE",
    "NO_BUDGET",
    "NOT_NOW",
    "CHOSE_OTHER",
    "CANT_REACH_DM",
    "OTHER",
  ]),
  comment: z.string().optional(),
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
      return NextResponse.json({ error: "Укажите причину отказа" }, { status: 400 });
    }
    const data = parsed.data;

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: data.reason,
        rejectionComment: data.comment,
        nextContactAt: null,
      },
    });
    await prisma.task.updateMany({
      where: { leadId: id, status: "PENDING" },
      data: { status: "CANCELLED" },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: id,
        userId: actor.id,
        type: "REJECTION",
        comment: `Причина отказа: ${REJECTION_REASON_LABELS[data.reason]}${data.comment ? ". " + data.comment : ""}`,
        metadata: { reason: data.reason },
      },
    });

    await logAudit({
      actor,
      action: "REJECT_LEAD",
      entityType: "Lead",
      entityId: id,
      newValue: { reason: REJECTION_REASON_LABELS[data.reason] },
    });

    revalidateCrm();
    return NextResponse.json({ lead: updated });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
