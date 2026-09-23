"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Plus, Pencil, Trash2, Wallet, Receipt } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ConfirmDeleteModal } from "@/components/shared/confirm-delete-modal";
import { useToast } from "@/components/ui/toast";
import { ExpenseFormModal, type ExpenseDraft } from "@/components/expenses/expense-form-modal";
import { EXPENSE_TYPE_LABELS } from "@/lib/labels";
import { EXPENSE_PERIOD_SHORT, PAYOUT_ROLE_LABELS, formatMoney, normalizeUrl, monthlyCost, sumMonthly, sumYearly } from "@/lib/finance";
import { formatDate, formatShortDate } from "@/lib/format";
import type { ExpensePeriod, ExpenseType, PayoutRole, PayoutStatus } from "@/generated/prisma/enums";

export interface LeadDeal {
  id: string;
  amount: number;
  comment: string | null;
  closedAt: string;
  closedBy: { firstName: string; lastName: string };
  payouts: {
    id: string;
    role: PayoutRole;
    percent: number;
    amount: number;
    status: PayoutStatus;
    user: { firstName: string; lastName: string };
  }[];
  expenses: {
    id: string;
    type: ExpenseType;
    name: string;
    url: string | null;
    amount: number;
    period: ExpensePeriod;
    renewsAt: string | null;
    comment: string | null;
  }[];
}

/** Финансы проекта на странице лида: сумма сделки, выплаты, расходы. */
export function DealPanel({ deal, canManage }: { deal: LeadDeal; canManage: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [expenseForm, setExpenseForm] = useState<{ open: boolean; expense: ExpenseDraft | null }>({
    open: false,
    expense: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [amountOpen, setAmountOpen] = useState(false);
  const [amount, setAmount] = useState(String(deal.amount));
  const [saving, setSaving] = useState(false);

  const payoutTotal = deal.payouts.reduce((s, p) => s + p.amount, 0);
  const pendingTotal = deal.payouts.filter((p) => p.status === "PENDING").reduce((s, p) => s + p.amount, 0);
  const monthlyTotal = sumMonthly(deal.expenses);
  const yearlyTotal = sumYearly(deal.expenses);

  async function saveAmount() {
    setSaving(true);
    try {
      const res = await fetch(`/api/deals/${deal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount || 0) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error("Не удалось изменить сумму", data.error);
        return;
      }
      toast.success("Сумма сделки обновлена", formatMoney(Number(amount)));
      setAmountOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function deleteExpense() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/expenses/${deleteTarget.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error("Не удалось удалить расход", data.error);
      return;
    }
    toast.success("Расход удалён", deleteTarget.name);
    setDeleteTarget(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Сделка"
          description={`Закрыта ${formatDate(deal.closedAt)} · ${deal.closedBy.firstName} ${deal.closedBy.lastName}`}
          action={
            canManage ? (
              <Button variant="secondary" size="sm" icon={<Pencil />} onClick={() => setAmountOpen(true)}>
                Сумма
              </Button>
            ) : undefined
          }
        />
        <CardBody>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border-subtle p-3">
              <p className="text-[12px] text-text-secondary">Заплатили за работу</p>
              <p className="mt-1 text-[22px] leading-none font-semibold text-text-primary">
                {formatMoney(deal.amount)}
              </p>
            </div>
            <div className="rounded-lg border border-border-subtle p-3">
              <p className="text-[12px] text-text-secondary">Выплаты сотрудникам</p>
              <p className="mt-1 text-[22px] leading-none font-semibold text-text-primary">
                {formatMoney(payoutTotal)}
              </p>
              {pendingTotal > 0 && (
                <p className="mt-1.5 text-[12px] text-warning-700">Ждёт выплаты {formatMoney(pendingTotal)}</p>
              )}
            </div>
            <div className="rounded-lg border border-border-subtle p-3">
              <p className="text-[12px] text-text-secondary">Расходы в месяц</p>
              <p className="mt-1 text-[22px] leading-none font-semibold text-text-primary">
                {formatMoney(monthlyTotal)}
              </p>
              {monthlyTotal > 0 && (
                <p className="mt-1.5 text-[12px] text-text-tertiary">{formatMoney(yearlyTotal)} в год</p>
              )}
            </div>
          </div>
          {deal.comment && <p className="mt-3 text-[13px] text-text-secondary">{deal.comment}</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Кому выплатить за этот проект" />
        <CardBody className="p-0">
          {deal.payouts.length === 0 ? (
            <p className="px-5 py-4 text-[13px] text-text-tertiary">
              Выплат нет — лид нашёл сам руководитель.
            </p>
          ) : (
            <div className="divide-y divide-border-subtle">
              {deal.payouts.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-600">
                    <Wallet className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-text-primary">
                      {p.user.firstName} {p.user.lastName}
                    </p>
                    <p className="truncate text-xs text-text-tertiary">
                      {PAYOUT_ROLE_LABELS[p.role]} · {p.percent}%
                    </p>
                  </div>
                  <span className="ml-auto text-[15px] font-semibold text-text-primary tabular-nums">
                    {formatMoney(p.amount)}
                  </span>
                  <Badge tone={p.status === "PAID" ? "success" : "warning"} dot>
                    {p.status === "PAID" ? "Выплачено" : "Ожидает"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Ежемесячные расходы"
          description="Хостинг, домен, почта и сервисы проекта"
          action={
            canManage ? (
              <Button
                variant="secondary"
                size="sm"
                icon={<Plus />}
                onClick={() => setExpenseForm({ open: true, expense: null })}
              >
                Добавить
              </Button>
            ) : undefined
          }
        />
        <CardBody className="p-0">
          {deal.expenses.length === 0 ? (
            <p className="px-5 py-4 text-[13px] text-text-tertiary">Расходов пока нет.</p>
          ) : (
            <div className="divide-y divide-border-subtle">
              {deal.expenses.map((e) => (
                <div key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-2.5 px-4 py-3 sm:px-5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-600">
                    <Receipt className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[13px] font-medium text-text-primary">{e.name}</p>
                      <Badge tone="neutral">{EXPENSE_TYPE_LABELS[e.type]}</Badge>
                    </div>
                    <p className="truncate text-xs text-text-tertiary">
                      {EXPENSE_PERIOD_SHORT[e.period]}
                      {e.period === "YEARLY" ? ` · ${formatMoney(monthlyCost(e))} в месяц` : ""}
                      {e.renewsAt ? ` · продление ${formatShortDate(e.renewsAt)}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-right text-[15px] font-semibold text-text-primary tabular-nums">
                    {formatMoney(e.amount)}
                    <span className="block text-[11px] font-normal text-text-tertiary">
                      {EXPENSE_PERIOD_SHORT[e.period]}
                    </span>
                  </span>

                  {/* На телефоне кнопки уезжают на свою строку, на десктопе остаются в ряду */}
                  <div className="flex w-full items-center justify-end gap-1 pl-11 sm:w-auto sm:pl-0">
                    {e.url && (
                      <a href={normalizeUrl(e.url)} target="_blank" rel="noopener noreferrer">
                        <Button variant="secondary" size="sm" icon={<ExternalLink />}>
                          Открыть
                        </Button>
                      </a>
                    )}
                    {canManage && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Изменить расход"
                          onClick={() =>
                            setExpenseForm({
                              open: true,
                              expense: {
                                id: e.id,
                                type: e.type,
                                name: e.name,
                                url: e.url ?? "",
                                amount: String(e.amount),
                                period: e.period,
                                renewsAt: e.renewsAt ? e.renewsAt.slice(0, 10) : "",
                                comment: e.comment ?? "",
                              },
                            })
                          }
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Удалить расход"
                          onClick={() => setDeleteTarget({ id: e.id, name: e.name })}
                        >
                          <Trash2 className="h-4 w-4 text-danger-600" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <ExpenseFormModal
        open={expenseForm.open}
        dealId={deal.id}
        expense={expenseForm.expense}
        onClose={() => setExpenseForm({ open: false, expense: null })}
        onSuccess={() => {
          setExpenseForm({ open: false, expense: null });
          router.refresh();
        }}
      />

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Удаление расхода"
        description={
          <>
            Удалить расход <span className="font-semibold">{deleteTarget?.name}</span>?
          </>
        }
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteExpense}
      />

      <Modal
        open={amountOpen}
        onClose={() => setAmountOpen(false)}
        title="Сумма сделки"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAmountOpen(false)}>
              Отмена
            </Button>
            <Button variant="primary" loading={saving} onClick={saveAmount}>
              Сохранить
            </Button>
          </>
        }
      >
        <Input
          label="Заплатили за работу, ₽"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
          hint="Выплаты пересчитаются автоматически по тем же процентам"
        />
      </Modal>
    </div>
  );
}
