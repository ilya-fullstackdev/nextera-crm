import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole, ApiAuthError } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";
import { revalidateCrm } from "@/lib/revalidate";

const schema = z.object({
  type: z.enum(["HOSTING", "DOMAIN", "SSL", "EMAIL", "SERVICE", "OTHER"]).default("OTHER"),
  name: z.string().min(1, "Укажите название расхода"),
  url: z.string().optional(),
  amount: z.coerce.number().int().min(0, "Сумма не может быть отрицательной"),
  period: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
  renewsAt: z.string().optional(),
  comment: z.string().optional(),
});

/** Добавление ежемесячного расхода к проекту. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireApiRole(["DIRECTOR"]);
    const { id } = await params;

    const deal = await prisma.deal.findUnique({
      where: { id },
      include: { lead: { include: { company: true } } },
    });
    if (!deal) {
      return NextResponse.json({ error: "Сделка не найдена" }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Некорректные данные" }, { status: 400 });
    }
    const data = parsed.data;

    const expense = await prisma.projectExpense.create({
      data: {
        dealId: id,
        type: data.type,
        name: data.name,
        url: data.url?.trim() || null,
        amount: data.amount,
        period: data.period,
        renewsAt: data.renewsAt ? new Date(data.renewsAt) : null,
        comment: data.comment?.trim() || null,
      },
    });

    await logAudit({
      actor,
      action: "CREATE_EXPENSE",
      entityType: "ProjectExpense",
      entityId: expense.id,
      newValue: { expense: `${data.name} для «${deal.lead.company.name}»` },
    });

    revalidateCrm();
    return NextResponse.json({ expense });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
