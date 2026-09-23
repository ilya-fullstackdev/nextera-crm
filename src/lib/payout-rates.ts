import "server-only";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";

/**
 * Проценты выплат закреплены за должностью, а не за сделкой: меняются один раз
 * в разделе «Выплаты» и применяются ко всем новым сделкам одинаково.
 */
export const DEFAULT_RATES: Record<Role, { finderPercent: number; recruiterPercent: number }> = {
  OPERATOR: { finderPercent: 10, recruiterPercent: 0 },
  HR_OPERATOR: { finderPercent: 10, recruiterPercent: 5 },
  HR: { finderPercent: 0, recruiterPercent: 5 },
  DIRECTOR: { finderPercent: 0, recruiterPercent: 0 },
};

export const RATE_ROLES: Role[] = ["OPERATOR", "HR_OPERATOR", "HR"];

/**
 * Какие выплаты вообще возможны для должности.
 * Оператор не занимается наймом, кадровик не ведёт лиды, и только совмещённая
 * должность получает и за свой лид, и за приведённого сотрудника.
 */
export const RATE_CAPABILITIES: Record<Role, { finder: boolean; recruiter: boolean }> = {
  OPERATOR: { finder: true, recruiter: false },
  HR_OPERATOR: { finder: true, recruiter: true },
  HR: { finder: false, recruiter: true },
  DIRECTOR: { finder: false, recruiter: false },
};

export type PayoutRates = Record<Role, { finderPercent: number; recruiterPercent: number }>;

/** Ставки по всем должностям; отсутствующие создаются со значениями по умолчанию. */
export async function getPayoutRates(): Promise<PayoutRates> {
  const stored = await prisma.payoutRate.findMany();
  const byRole = new Map(stored.map((r) => [r.role, r]));

  const missing = RATE_ROLES.filter((role) => !byRole.has(role));
  if (missing.length > 0) {
    await prisma.payoutRate.createMany({
      data: missing.map((role) => ({ role, ...DEFAULT_RATES[role] })),
      skipDuplicates: true,
    });
  }

  const rates = {} as PayoutRates;
  for (const role of Object.keys(DEFAULT_RATES) as Role[]) {
    const row = byRole.get(role);
    const raw = row
      ? { finderPercent: row.finderPercent, recruiterPercent: row.recruiterPercent }
      : DEFAULT_RATES[role];
    // Неприменимые к должности выплаты обнуляем — на них не должно быть начислений.
    const can = RATE_CAPABILITIES[role];
    rates[role] = {
      finderPercent: can.finder ? raw.finderPercent : 0,
      recruiterPercent: can.recruiter ? raw.recruiterPercent : 0,
    };
  }
  return rates;
}
