"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Undo2, Wallet, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { PAYOUT_ROLE_LABELS, formatMoney } from "@/lib/finance";
import { formatDate } from "@/lib/format";
import type { PayoutRole, PayoutStatus } from "@/generated/prisma/enums";

export interface PayoutRow {
  id: string;
  role: PayoutRole;
  percent: number;
  amount: number;
  status: PayoutStatus;
  paidAt: string | null;
  user: { id: string; firstName: string; lastName: string };
}

export interface DealPayouts {
  id: string;
  amount: number;
  closedAt: string;
  leadId: string;
  companyName: string;
  payouts: PayoutRow[];
}

export function PayoutsClient({ deals }: { deals: DealPayouts[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function setStatus(payout: PayoutRow, status: PayoutStatus) {
    setBusy(payout.id);
    try {
      const res = await fetch(`/api/payouts/${payout.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error("Не удалось изменить статус выплаты", data.error);
        return;
      }
      toast.success(
        status === "PAID" ? "Отмечено как выплачено" : "Отметка о выплате снята",
        `${payout.user.firstName} ${payout.user.lastName} · ${formatMoney(payout.amount)}`
      );
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (deals.length === 0) {
    return (
      <Card className="p-0">
        <EmptyState
          icon={<Wallet />}
          title="Выплат пока нет"
          description="Выплаты появляются, когда руководитель закрывает сделку и указывает её сумму"
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {deals.map((deal) => {
        const pending = deal.payouts.filter((p) => p.status === "PENDING");
        const pendingSum = pending.reduce((s, p) => s + p.amount, 0);

        return (
          <Card key={deal.id} className="overflow-hidden">
            {/* Шапка проекта: за что именно платим */}
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
                  Сделка на {formatMoney(deal.amount)} · закрыта {formatDate(deal.closedAt)}
                </p>
              </div>
              <div className="shrink-0 sm:text-right">
                <p className="text-[12px] text-text-secondary">К выплате по проекту</p>
                <p className="text-[17px] font-semibold text-text-primary">{formatMoney(pendingSum)}</p>
              </div>
            </div>

            {deal.payouts.length === 0 ? (
              <p className="px-5 py-4 text-[13px] text-text-tertiary">
                По этому проекту выплат нет — лид нашёл сам руководитель.
              </p>
            ) : (
              <div className="divide-y divide-border-subtle">
                {deal.payouts.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2.5 px-4 py-3 sm:px-5">
                    <Avatar firstName={p.user.firstName} lastName={p.user.lastName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-text-primary">
                        {p.user.firstName} {p.user.lastName}
                      </p>
                      <p className="truncate text-xs text-text-tertiary">
                        {PAYOUT_ROLE_LABELS[p.role]} · {p.percent}% от суммы сделки
                      </p>
                    </div>

                    <span className="shrink-0 text-[15px] font-semibold text-text-primary tabular-nums">
                      {formatMoney(p.amount)}
                    </span>

                    {/* На телефоне статус и кнопка уезжают на свою строку, на десктопе остаются в ряду */}
                    <div className="flex w-full items-center justify-between gap-2 pl-11 sm:w-auto sm:justify-end sm:pl-0">
                      {p.status === "PAID" ? (
                        <>
                          <Badge tone="success" dot>
                            Выплачено{p.paidAt ? ` ${formatDate(p.paidAt)}` : ""}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Undo2 />}
                            loading={busy === p.id}
                            onClick={() => setStatus(p, "PENDING")}
                          >
                            Отменить
                          </Button>
                        </>
                      ) : (
                        <>
                          <Badge tone="warning" dot>
                            Ожидает выплаты
                          </Badge>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<Check />}
                            loading={busy === p.id}
                            onClick={() => setStatus(p, "PAID")}
                        >
                          Выплачено
                        </Button>
                      </>
                    )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
