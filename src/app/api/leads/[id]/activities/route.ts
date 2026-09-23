import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiLeadsAccess, ApiAuthError } from "@/lib/auth/guards";
import { applyAutoStatus } from "@/lib/lead-progression";
import { revalidateCrm } from "@/lib/revalidate";

const schema = z.object({
  type: z.enum(["CALL", "MESSAGE", "EMAIL", "MEETING", "NOTE"]),
  comment: z.string().min(1, "Добавьте комментарий"),
  nextContactAt: z.string().optional(),
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

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Некорректные данные" }, { status: 400 });
    }
    const data = parsed.data;

    const activity = await prisma.leadActivity.create({
      data: {
        leadId: id,
        userId: actor.id,
        type: data.type,
        comment: data.comment,
        metadata: data.type === "CALL" ? { attempt: lead.contactAttempts + 1 } : undefined,
      },
      include: { user: true },
    });

    const leadUpdate: Record<string, unknown> = {};
    if (data.type === "CALL") {
      leadUpdate.contactAttempts = lead.contactAttempts + 1;
    }
    if (data.nextContactAt) {
      leadUpdate.nextContactAt = new Date(data.nextContactAt);
    }
    if (Object.keys(leadUpdate).length > 0) {
      await prisma.lead.update({ where: { id }, data: leadUpdate });
    }

    if (data.nextContactAt) {
      await prisma.task.create({
        data: {
          leadId: id,
          title: "Повторный контакт с клиентом",
          type: "FOLLOW_UP",
          dueAt: new Date(data.nextContactAt),
          assigneeId: lead.ownerId,
          createdById: actor.id,
        },
      });
    }

    // Звонок или встреча сами двигают лид по воронке.
    const autoStatus = await applyAutoStatus(id, actor);

    revalidateCrm();
    return NextResponse.json({ activity, autoStatus });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
