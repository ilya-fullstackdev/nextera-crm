import type { ExpensePeriod, PayoutRole } from "@/generated/prisma/enums";

export const EXPENSE_PERIOD_LABELS: Record<ExpensePeriod, string> = {
  MONTHLY: "Раз в месяц",
  YEARLY: "Раз в год",
};

export const EXPENSE_PERIOD_SHORT: Record<ExpensePeriod, string> = {
  MONTHLY: "в месяц",
  YEARLY: "в год",
};

export const PAYOUT_ROLE_LABELS: Record<PayoutRole, string> = {
  LEAD_FINDER: "Нашёл лид",
  RECRUITER: "Привёл сотрудника",
};

export const PAYOUT_ROLE_HINTS: Record<PayoutRole, string> = {
  LEAD_FINDER: "Процент тому, кто нашёл и завёл этот лид",
  RECRUITER: "Процент тому, кто привёл этого сотрудника в отдел холодных звонков",
};

/** Сумма выплаты от суммы сделки, округлённая до рубля. */
export function calcPayout(amount: number, percent: number) {
  return Math.round((amount * percent) / 100);
}

/** 120000 → «120 000 ₽» */
export function formatMoney(value: number) {
  return `${new Intl.NumberFormat("ru-RU").format(value)} ₽`;
}

/** Ссылка может быть записана без протокола — приводим к рабочему виду. */
export function normalizeUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Расход, приведённый к одному месяцу: годовые платежи делятся на 12. */
export function monthlyCost(expense: { amount: number; period: ExpensePeriod }) {
  return expense.period === "YEARLY" ? Math.round(expense.amount / 12) : expense.amount;
}

/** Расход, приведённый к году. */
export function yearlyCost(expense: { amount: number; period: ExpensePeriod }) {
  return expense.period === "YEARLY" ? expense.amount : expense.amount * 12;
}

export function sumMonthly(expenses: { amount: number; period: ExpensePeriod }[]) {
  return expenses.reduce((sum, e) => sum + monthlyCost(e), 0);
}

export function sumYearly(expenses: { amount: number; period: ExpensePeriod }[]) {
  return expenses.reduce((sum, e) => sum + yearlyCost(e), 0);
}
