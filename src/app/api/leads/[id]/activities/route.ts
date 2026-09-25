import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiLeadsAccess, ApiAuthError } from "@/lib/auth/guards";
import { applyAutoStatus } from "@/lib/lead-progression";
import { revalidateCrm } from "@/lib/revalidate";

const schema = z
  .object({
    type: z.enum(["CALL", "MESSAGE", "EMAIL", "MEETING", "NOTE"]),
    // Итог звонка из быстрых кнопок — комментарий к нему не обязателен.
    outcome: z.string().trim().max(100).optional(),
    comment: z.string().trim().optional(),
    // Для звонка null означает «больше не звонить» — лид уходит из очереди.
    nextContactAt: z.string().nullable().optional(),
  })
  .refine((d) => d.comment || (d.type === "CALL" && d.outcome), {
    message: "Добавьте комментарий",
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
    const isCall = data.type === "CALL";
    const comment = [data.outcome, data.comment].filter(Boolean).join(". ");

    const activity = await prisma.leadActivity.create({
      data: {
        leadId: id,
        userId: actor.id,
        type: data.type,
        comment,
        metadata: isCall
          ? { attempt: lead.contactAttempts + 1, ...(data.outcome ? { outcome: data.outcome } : {}) }
          : undefined,
      },
      include: { user: true },
    });

    const leadUpdate: Record<string, unknown> = {};
    if (isCall) {
      leadUpdate.contactAttempts = lead.contactAttempts + 1;
      // Итог звонка сам заполняет квалификацию — руками ничего переключать не нужно.
      if (data.outcome === "Вышли на ЛПР" && lead.dmStatus === "NOT_FOUND") {
        leadUpdate.dmStatus = "FOUND";
      }
      if (data.outcome === "Клиент заинтересован" && lead.needLevel === "NONE") {
        leadUpdate.needLevel = "POTENTIAL";
      }
    }
    if (data.nextContactAt) {
      leadUpdate.nextContactAt = new Date(data.nextContactAt);
    } else if (isCall) {
      leadUpdate.nextContactAt = null;
    }
    if (Object.keys(leadUpdate).length > 0) {
      await prisma.lead.update({ where: { id }, data: leadUpdate });
    }

    // Очередь звонков строится по дате следующего звонка у лида. Старые задачи
    // на звонок по этому лиду закрываем, чтобы они не висели просроченными.
    if (isCall) {
      await prisma.task.updateMany({
        where: {
          leadId: id,
          status: "PENDING",
          type: { in: ["CALL", "FOLLOW_UP"] },
        },
        data: { status: "DONE", completedAt: new Date() },
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
