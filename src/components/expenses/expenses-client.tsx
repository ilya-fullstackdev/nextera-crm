"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ExternalLink, Server, Globe, ShieldCheck, Mail, Boxes, Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDeleteModal } from "@/components/shared/confirm-delete-modal";
import { useToast } from "@/components/ui/toast";
import { ExpenseFormModal, type ExpenseDraft } from "@/components/expenses/expense-form-modal";
import { EXPENSE_TYPE_LABELS } from "@/lib/labels";
import { EXPENSE_PERIOD_SHORT, formatMoney, normalizeUrl, monthlyCost, sumMonthly } from "@/lib/finance";
import { formatShortDate } from "@/lib/format";
import type { ExpensePeriod, ExpenseType } from "@/generated/prisma/enums";

const TYPE_ICONS: Record<ExpenseType, React.ReactNode> = {
  HOSTING: <Server />,
  DOMAIN: <Globe />,
  SSL: <ShieldCheck />,
  EMAIL: <Mail />,
  SERVICE: <Boxes />,
  OTHER: <Receipt />,
};

export interface ExpenseRow {
  id: string;
  type: ExpenseType;
  name: string;
  url: string | null;
  amount: number;
  period: ExpensePeriod;
  renewsAt: string | null;
  comment: string | null;
}

export interface DealExpenses {
  id: string;
  leadId: string;
  companyName: string;
  website: string | null;
  amount: number;
  expenses: ExpenseRow[];
}

export function ExpensesClient({ deals }: { deals: DealExpenses[] }) {
  const router = useRouter();
  const toast = useToast();
  const [formState, setFormState] = useState<{ dealId: string; expense: ExpenseDraft | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseRow | null>(null);

  async function handleDelete() {
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

  function toDraft(e: ExpenseRow): ExpenseDraft {
    return {
      id: e.id,
      type: e.type,
      name: e.name,
      url: e.url ?? "",
      amount: String(e.amount),
      period: e.period,
      renewsAt: e.renewsAt ? e.renewsAt.slice(0, 10) : "",
      comment: e.comment ?? "",
    };
  }

  if (deals.length === 0) {
    return (
      <Card className="p-0">
        <EmptyState
          icon={<Receipt />}
          title="Проектов пока нет"
          description="Расходы ведутся по закрытым сделкам — закройте сделку, чтобы добавить хостинг и домены"
        />
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {deals.map((deal) => {
          const monthly = sumMonthly(deal.expenses);
          return (
            <Card key={deal.id} className="overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-border-subtle px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0">
                  <Link
                    href={`/crm/leads/${deal.leadId}`}
                    className="flex items-center gap-1.5 text-sm font-semibold text-text-primary hover:text-primary-600"
                  >
                    {deal.companyName}
                    <ExternalLink className="h-3.5 w-3.5 text-text-tertiary" />
                  </Link>
                  <p className="mt-0.5 text-xs text-text-tertiary">
                    Сделка на {formatMoney(deal.amount)}
                    {deal.website ? ` · ${deal.website}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                  <div className="sm:text-right">
                    <p className="text-[12px] text-text-secondary">В месяц</p>
                    <p className="text-[17px] font-semibold text-text-primary">{formatMoney(monthly)}</p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Plus />}
                    onClick={() => setFormState({ dealId: deal.id, expense: null })}
                  >
                    Добавить
                  </Button>
                </div>
              </div>

              {deal.expenses.length === 0 ? (
                <p className="px-5 py-4 text-[13px] text-text-tertiary">
                  Ежемесячных расходов по проекту нет.
                </p>
              ) : (
                <div className="divide-y divide-border-subtle">
                  {deal.expenses.map((e) => (
                    <div key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-2.5 px-4 py-3 sm:px-5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-600 [&>svg]:h-4 [&>svg]:w-4">
                        {TYPE_ICONS[e.type]}
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
                          {e.comment ? ` · ${e.comment}` : ""}
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
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Изменить расход"
                          onClick={() => setFormState({ dealId: deal.id, expense: toDraft(e) })}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Удалить расход"
                          onClick={() => setDeleteTarget(e)}
                        >
                          <Trash2 className="h-4 w-4 text-danger-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <ExpenseFormModal
        open={Boolean(formState)}
        dealId={formState?.dealId ?? ""}
        expense={formState?.expense ?? null}
        onClose={() => setFormState(null)}
        onSuccess={() => {
          setFormState(null);
          router.refresh();
        }}
      />

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Удаление расхода"
        description={
          <>
            Удалить расход <span className="font-semibold">{deleteTarget?.name}</span> из проекта?
          </>
        }
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
