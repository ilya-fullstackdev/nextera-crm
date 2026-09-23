import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole, ApiAuthError } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";
import { revalidateCrm } from "@/lib/revalidate";
import { formatMoney } from "@/lib/finance";

const schema = z.object({ status: z.enum(["PENDING", "PAID"]) });

/** Отметка «выплачено» / снятие отметки. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireApiRole(["DIRECTOR"]);
    const { id } = await params;

    const payout = await prisma.payout.findUnique({
      where: { id },
      include: { user: true, deal: { include: { lead: { include: { company: true } } } } },
    });
    if (!payout) {
      return NextResponse.json({ error: "Выплата не найдена" }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
    }

    const paid = parsed.data.status === "PAID";
    const updated = await prisma.payout.update({
      where: { id },
      data: { status: parsed.data.status, paidAt: paid ? new Date() : null },
    });

    await logAudit({
      actor,
      action: paid ? "PAY_PAYOUT" : "UNPAY_PAYOUT",
      entityType: "Payout",
      entityId: id,
      newValue: {
        payout: `${payout.user.firstName} ${payout.user.lastName}, ${formatMoney(payout.amount)} за «${payout.deal.lead.company.name}»`,
      },
    });

    revalidateCrm();
    return NextResponse.json({ payout: updated });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
