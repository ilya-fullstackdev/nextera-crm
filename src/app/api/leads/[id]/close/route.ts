import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole, ApiAuthError } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";
import { revalidateCrm } from "@/lib/revalidate";
import { calcPayout, formatMoney } from "@/lib/finance";
import { getPayoutRates } from "@/lib/payout-rates";
import { fullName } from "@/lib/auth/current-user";
import type { Prisma } from "@/generated/prisma/client";

const expenseSchema = z.object({
  type: z.enum(["HOSTING", "DOMAIN", "SSL", "EMAIL", "SERVICE", "OTHER"]).default("OTHER"),
  name: z.string().min(1, "Укажите название расхода"),
  url: z.string().optional(),
  amount: z.coerce.number().int().min(0, "Сумма не может быть отрицательной"),
  period: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
  comment: z.string().optional(),
});

// Проценты приходят не из формы: они закреплены за должностью получателя.
const schema = z.object({
  amount: z.coerce.number().int().positive("Укажите сумму сделки"),
  comment: z.string().optional(),
  expenses: z.array(expenseSchema).default([]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireApiRole(["DIRECTOR"]);
    const { id } = await params;

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        company: true,
        deal: true,
        createdBy: { include: { hiredBy: true } },
      },
    });
    if (!lead) {
      return NextResponse.json({ error: "Лид не найден" }, { status: 404 });
    }
    if (lead.deal) {
      return NextResponse.json({ error: "Сделка по этому лиду уже закрыта" }, { status: 409 });
    }
    if (lead.status === "REJECTED") {
      return NextResponse.json({ error: "Лид в отказе — сначала верните его в работу" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Некорректные данные" },
        { status: 400 }
      );
    }
    const data = parsed.data;

    // Кому платим: нашедшему лид и тому, кто привёл его в отдел холодных звонков.
    // Процент берём из ставки его должности, самому себе руководитель не платит.
    const rates = await getPayoutRates();
    const finder = lead.createdBy;
    const recruiter = finder.hiredBy;
    const payouts: Prisma.PayoutCreateManyDealInput[] = [];

    const eligible = (user: { id: string; deletedAt: Date | null } | null | undefined) =>
      Boolean(user && !user.deletedAt && user.id !== actor.id);

    const finderPercent = rates[finder.role].finderPercent;
    if (eligible(finder) && finderPercent > 0) {
      payouts.push({
        userId: finder.id,
        role: "LEAD_FINDER",
        percent: finderPercent,
        amount: calcPayout(data.amount, finderPercent),
      });
    }

    const recruiterPercent = recruiter ? rates[recruiter.role].recruiterPercent : 0;
    if (eligible(recruiter) && recruiter!.id !== finder.id && recruiterPercent > 0) {
      payouts.push({
        userId: recruiter!.id,
        role: "RECRUITER",
        percent: recruiterPercent,
        amount: calcPayout(data.amount, recruiterPercent),
      });
    }

    const deal = await prisma.deal.create({
      data: {
        leadId: lead.id,
        amount: data.amount,
        comment: data.comment,
        closedById: actor.id,
        payouts: { createMany: { data: payouts } },
        expenses: {
          createMany: {
            data: data.expenses.map((e) => ({
              type: e.type,
              name: e.name,
              url: e.url?.trim() || null,
              amount: e.amount,
              period: e.period,
              comment: e.comment?.trim() || null,
            })),
          },
        },
      },
      include: { payouts: { include: { user: true } }, expenses: true },
    });

    await prisma.$transaction([
      prisma.lead.update({ where: { id: lead.id }, data: { status: "DEAL" } }),
      prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          userId: actor.id,
          type: "STATUS_CHANGE",
          comment: `${fullName(actor)} закрыл сделку на ${formatMoney(data.amount)}`,
          metadata: { dealId: deal.id, amount: data.amount },
        },
      }),
    ]);

    await logAudit({
      actor,
      action: "CLOSE_DEAL",
      entityType: "Deal",
      entityId: deal.id,
      newValue: { deal: `${lead.company.name} — ${formatMoney(data.amount)}` },
    });

    revalidateCrm();
    return NextResponse.json({ deal });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
