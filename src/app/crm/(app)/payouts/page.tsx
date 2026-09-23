import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/topbar";
import { StatCard } from "@/components/dashboard/stat-card";
import { PayoutsClient, type DealPayouts } from "@/components/payouts/payouts-client";
import { PayoutRatesModal, type RateRow } from "@/components/payouts/payout-rates-modal";
import { getPayoutRates, RATE_CAPABILITIES, RATE_ROLES } from "@/lib/payout-rates";
import { formatMoney } from "@/lib/finance";
import { plural } from "@/lib/format";
import { Wallet, HandCoins, Handshake } from "lucide-react";

export default async function PayoutsPage() {
  await requireRole(["DIRECTOR"]);

  const rates = await getPayoutRates();
  const rateRows: RateRow[] = RATE_ROLES.map((role) => ({
    role,
    ...rates[role],
    canFinder: RATE_CAPABILITIES[role].finder,
    canRecruiter: RATE_CAPABILITIES[role].recruiter,
  }));

  const deals = await prisma.deal.findMany({
    orderBy: { closedAt: "desc" },
    include: {
      lead: { include: { company: true } },
      payouts: {
        orderBy: { role: "asc" },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
  });

  const rows: DealPayouts[] = deals.map((d) => ({
    id: d.id,
    amount: d.amount,
    closedAt: d.closedAt.toISOString(),
    leadId: d.leadId,
    companyName: d.lead.company.name,
    payouts: d.payouts.map((p) => ({
      id: p.id,
      role: p.role,
      percent: p.percent,
      amount: p.amount,
      status: p.status,
      paidAt: p.paidAt ? p.paidAt.toISOString() : null,
      user: p.user,
    })),
  }));

  const allPayouts = deals.flatMap((d) => d.payouts);
  const pendingSum = allPayouts.filter((p) => p.status === "PENDING").reduce((s, p) => s + p.amount, 0);
  const paidSum = allPayouts.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amount, 0);
  const dealsSum = deals.reduce((s, d) => s + d.amount, 0);
  const pendingCount = allPayouts.filter((p) => p.status === "PENDING").length;

  return (
    <>
      <Topbar title="Выплаты" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            icon={<Wallet />}
            label="Нужно выплатить"
            value={formatMoney(pendingSum)}
            tone="warning"
            hint={`${pendingCount} ${plural(pendingCount, ["выплата ожидает", "выплаты ожидают", "выплат ожидает"])}`}
          />
          <StatCard
            icon={<HandCoins />}
            label="Уже выплачено"
            value={formatMoney(paidSum)}
            tone="success"
            share={paidSum + pendingSum > 0 ? paidSum / (paidSum + pendingSum) : 0}
          />
          <StatCard
            icon={<Handshake />}
            label="Закрытых сделок"
            value={deals.length}
            tone="primary"
            hint={`На ${formatMoney(dealsSum)}`}
          />
        </div>

        {/* Настройка процентов спрятана под кнопку — её трогают редко */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-text-primary">Выплаты по проектам</h2>
          <PayoutRatesModal initialRates={rateRows} />
        </div>

        <div className="mt-3">
          <PayoutsClient deals={rows} />
        </div>
      </div>
    </>
  );
}
