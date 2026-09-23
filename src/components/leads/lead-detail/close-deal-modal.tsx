"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, X, Server, Globe, Mail, Receipt } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { EXPENSE_TYPE_LABELS } from "@/lib/labels";
import { EXPENSE_PERIOD_LABELS, calcPayout, formatMoney, monthlyCost } from "@/lib/finance";
import type { ExpensePeriod, ExpenseType } from "@/generated/prisma/enums";

export interface PayoutCandidate {
  id: string;
  firstName: string;
  lastName: string;
  /** Ставка его должности — настраивается в разделе «Выплаты». */
  percent: number;
  roleLabel: string;
}

interface ExpenseRow {
  type: ExpenseType;
  name: string;
  url: string;
  amount: string;
  period: ExpensePeriod;
}

/** Быстрое добавление типовых расходов — чаще всего нужны именно эти три. */
const PRESETS: { type: ExpenseType; name: string; icon: React.ReactNode; period: ExpensePeriod }[] = [
  { type: "HOSTING", name: "Хостинг", icon: <Server />, period: "MONTHLY" },
  { type: "DOMAIN", name: "Домен", icon: <Globe />, period: "YEARLY" },
  { type: "EMAIL", name: "Почта", icon: <Mail />, period: "MONTHLY" },
];

function emptyRow(preset?: (typeof PRESETS)[number]): ExpenseRow {
  return {
    type: preset?.type ?? "OTHER",
    name: preset?.name ?? "",
    url: "",
    amount: "",
    period: preset?.period ?? "MONTHLY",
  };
}

export function CloseDealModal({
  open,
  leadId,
  companyName,
  finder,
  recruiter,
  onClose,
  onSuccess,
}: {
  open: boolean;
  leadId: string;
  companyName: string;
  finder: PayoutCandidate | null;
  recruiter: PayoutCandidate | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);

  useEffect(() => {
    if (open) {
      setAmount("");
      setComment("");
      setExpenses([]);
    }
  }, [open]);

  const amountValue = Number(amount || 0);
  const finderSum = finder ? calcPayout(amountValue, finder.percent) : 0;
  const recruiterSum = recruiter ? calcPayout(amountValue, recruiter.percent) : 0;
  const payoutTotal = finderSum + recruiterSum;
  const monthlyTotal = expenses.reduce(
    (s, e) => s + monthlyCost({ amount: Number(e.amount || 0), period: e.period }),
    0
  );

  function updateRow(index: number, patch: Partial<ExpenseRow>) {
    setExpenses((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (amountValue <= 0) {
      toast.error("Укажите сумму, которую заплатили за работу");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountValue,
          comment: comment.trim(),
          expenses: expenses
            .filter((x) => x.name.trim())
            .map((x) => ({
              type: x.type,
              name: x.name.trim(),
              url: x.url.trim(),
              amount: Number(x.amount || 0),
              period: x.period,
            })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error("Не удалось закрыть сделку", data.error);
        return;
      }
      toast.success("Сделка закрыта", `${companyName} · ${formatMoney(amountValue)}`);
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  const payoutRows = [
    finder ? { ...finder, sum: finderSum, reason: "Нашёл лид" } : null,
    recruiter ? { ...recruiter, sum: recruiterSum, reason: "Привёл сотрудника в отдел" } : null,
  ].filter(Boolean) as ((PayoutCandidate & { sum: number; reason: string }))[];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Закрыть сделку"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" loading={loading} onClick={() => handleSubmit()}>
            Закрыть сделку
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Заплатили за работу, ₽"
          inputMode="numeric"
          autoFocus
          placeholder="150000"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
          required
        />

        {/* Выплаты только показываем: проценты заданы должностями */}
        <div className="rounded-lg border border-border-subtle bg-surface-muted/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] font-semibold text-text-primary">Выплаты</p>
            <Link href="/crm/payouts" className="text-[12px] font-medium text-primary-600 hover:text-primary-700">
              Изменить проценты
            </Link>
          </div>

          {payoutRows.length === 0 ? (
            <p className="mt-2 text-[13px] text-text-secondary">
              Выплачивать некому: лид нашли вы сами либо для этой должности процент равен нулю.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {payoutRows.map((row) => (
                <div key={row.id} className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-text-primary">
                      {row.firstName} {row.lastName}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {row.reason} · {row.percent}% — ставка должности «{row.roleLabel}»
                    </p>
                  </div>
                  <span className="text-[15px] font-semibold text-text-primary tabular-nums">
                    {formatMoney(row.sum)}
                  </span>
                </div>
              ))}

              <div className="flex items-center justify-between border-t border-border-subtle pt-2.5 text-[13px]">
                <span className="text-text-secondary">Остаётся студии</span>
                <span className="font-semibold text-text-primary tabular-nums">
                  {formatMoney(Math.max(amountValue - payoutTotal, 0))}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Регулярные расходы */}
        <div className="rounded-lg border border-border-subtle p-4">
          <p className="text-[13px] font-semibold text-text-primary">Регулярные расходы проекта</p>
          <p className="mt-0.5 text-xs text-text-tertiary">
            Хостинг, домен, почта. Можно пропустить и добавить позже
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <Button
                key={preset.type}
                type="button"
                variant="secondary"
                size="sm"
                icon={preset.icon}
                onClick={() => setExpenses((prev) => [...prev, emptyRow(preset)])}
              >
                {preset.name}
              </Button>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={<Plus />}
              onClick={() => setExpenses((prev) => [...prev, emptyRow()])}
            >
              Другое
            </Button>
          </div>

          {expenses.length > 0 && (
            <div className="mt-3 space-y-3">
              {expenses.map((row, i) => (
                <div key={i} className="rounded-lg border border-border-subtle bg-white p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-600">
                      <Receipt className="h-3.5 w-3.5" />
                    </span>
                    <select
                      value={row.type}
                      onChange={(e) => updateRow(i, { type: e.target.value as ExpenseType })}
                      aria-label="Тип расхода"
                      className="h-8 rounded-md border border-border-default bg-white px-2 text-[13px] focus:border-primary-500 focus:outline-none"
                    >
                      {Object.entries(EXPENSE_TYPE_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="ml-auto"
                      aria-label="Убрать расход"
                      onClick={() => setExpenses((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                    <Input
                      label="Название"
                      placeholder="Хостинг Beget"
                      value={row.name}
                      onChange={(e) => updateRow(i, { name: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-2.5">
                      <Input
                        label="Сумма, ₽"
                        inputMode="numeric"
                        value={row.amount}
                        onChange={(e) => updateRow(i, { amount: e.target.value.replace(/[^\d]/g, "") })}
                      />
                      <Select
                        label="Как часто"
                        value={row.period}
                        onChange={(e) => updateRow(i, { period: e.target.value as ExpensePeriod })}
                      >
                        {Object.entries(EXPENSE_PERIOD_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <Input
                      className="sm:col-span-2"
                      label="Ссылка на панель"
                      placeholder="cp.beget.com"
                      value={row.url}
                      onChange={(e) => updateRow(i, { url: e.target.value })}
                    />
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between border-t border-border-subtle pt-2.5 text-[13px]">
                <span className="text-text-secondary">В пересчёте на месяц</span>
                <span className="font-semibold text-text-primary tabular-nums">{formatMoney(monthlyTotal)}</span>
              </div>
            </div>
          )}
        </div>

        <Textarea
          label="Комментарий к сделке"
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </form>
    </Modal>
  );
}
