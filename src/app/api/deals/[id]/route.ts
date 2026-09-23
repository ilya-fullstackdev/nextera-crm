import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole, ApiAuthError } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";
import { revalidateCrm } from "@/lib/revalidate";
import { calcPayout, formatMoney } from "@/lib/finance";

const updateSchema = z.object({
  amount: z.coerce.number().int().positive("Укажите сумму сделки").optional(),
  comment: z.string().optional(),
});

/** Правка суммы сделки: выплаты пересчитываются автоматически. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireApiRole(["DIRECTOR"]);
    const { id } = await params;

    const deal = await prisma.deal.findUnique({
      where: { id },
      include: { payouts: true, lead: { include: { company: true } } },
    });
    if (!deal) {
      return NextResponse.json({ error: "Сделка не найдена" }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Некорректные данные" }, { status: 400 });
    }
    const data = parsed.data;

    const amountChanged = data.amount !== undefined && data.amount !== deal.amount;
    if (amountChanged && deal.payouts.some((p) => p.status === "PAID")) {
      return NextResponse.json(
        { error: "По сделке уже есть выплаченные суммы — сумму сделки менять нельзя" },
        { status: 409 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.deal.update({
        where: { id },
        data: {
          ...(data.amount !== undefined ? { amount: data.amount } : {}),
          ...(data.comment !== undefined ? { comment: data.comment.trim() || null } : {}),
        },
      });

      if (amountChanged) {
        for (const payout of deal.payouts) {
          await tx.payout.update({
            where: { id: payout.id },
            data: { amount: calcPayout(next.amount, payout.percent) },
          });
        }
      }
      return next;
    });

    await logAudit({
      actor,
      action: "UPDATE_DEAL",
      entityType: "Deal",
      entityId: id,
      oldValue: { amount: deal.amount },
      newValue: { deal: `${deal.lead.company.name} — ${formatMoney(updated.amount)}` },
    });

    revalidateCrm();
    return NextResponse.json({ deal: updated });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}

/** Отмена ошибочно закрытой сделки: лид возвращается в переговоры. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireApiRole(["DIRECTOR"]);
    const { id } = await params;

    const deal = await prisma.deal.findUnique({
      where: { id },
      include: { payouts: true, lead: { include: { company: true } } },
    });
    if (!deal) {
      return NextResponse.json({ error: "Сделка не найдена" }, { status: 404 });
    }
    if (deal.payouts.some((p) => p.status === "PAID")) {
      return NextResponse.json(
        { error: "По сделке уже есть выплаченные суммы — отменить её нельзя" },
        { status: 409 }
      );
    }

    await prisma.$transaction([
      // Выплаты и расходы удаляются каскадом вместе со сделкой.
      prisma.deal.delete({ where: { id } }),
      prisma.lead.update({ where: { id: deal.leadId }, data: { status: "NEGOTIATION" } }),
    ]);

    await logAudit({
      actor,
      action: "UPDATE_DEAL",
      entityType: "Deal",
      entityId: id,
      newValue: { deal: `${deal.lead.company.name} — сделка отменена` },
    });

    revalidateCrm();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
