import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole, ApiAuthError } from "@/lib/auth/guards";
import { getPayoutRates, RATE_CAPABILITIES, RATE_ROLES } from "@/lib/payout-rates";
import { logAudit } from "@/lib/audit";
import { revalidateCrm } from "@/lib/revalidate";
import { ROLE_LABELS } from "@/lib/labels";

const schema = z.object({
  rates: z.array(
    z.object({
      role: z.enum(["OPERATOR", "DIRECTOR", "HR", "HR_OPERATOR"]),
      finderPercent: z.coerce.number().min(0).max(100),
      recruiterPercent: z.coerce.number().min(0).max(100),
    })
  ),
});

export async function GET() {
  try {
    await requireApiRole(["DIRECTOR"]);
    return NextResponse.json({ rates: await getPayoutRates() });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}

/** Ставки общие для всех сделок, поэтому меняются здесь, а не при закрытии сделки. */
export async function PATCH(request: Request) {
  try {
    const actor = await requireApiRole(["DIRECTOR"]);
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Проценты должны быть от 0 до 100" },
        { status: 400 }
      );
    }

    // Процент за то, чем должность не занимается, сохранить нельзя.
    const incoming = parsed.data.rates
      .filter((r) => RATE_ROLES.includes(r.role))
      .map((r) => ({
        role: r.role,
        finderPercent: RATE_CAPABILITIES[r.role].finder ? r.finderPercent : 0,
        recruiterPercent: RATE_CAPABILITIES[r.role].recruiter ? r.recruiterPercent : 0,
      }));
    await prisma.$transaction(
      incoming.map((r) =>
        prisma.payoutRate.upsert({
          where: { role: r.role },
          create: { role: r.role, finderPercent: r.finderPercent, recruiterPercent: r.recruiterPercent },
          update: { finderPercent: r.finderPercent, recruiterPercent: r.recruiterPercent },
        })
      )
    );

    await logAudit({
      actor,
      action: "UPDATE_PAYOUT_RATES",
      entityType: "PayoutRate",
      newValue: {
        rates: incoming
          .map((r) => `${ROLE_LABELS[r.role]}: ${r.finderPercent}% / ${r.recruiterPercent}%`)
          .join(", "),
      },
    });

    revalidateCrm();
    return NextResponse.json({ rates: await getPayoutRates() });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
