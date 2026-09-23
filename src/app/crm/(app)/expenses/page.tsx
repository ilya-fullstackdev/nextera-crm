import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/topbar";
import { StatCard } from "@/components/dashboard/stat-card";
import { ExpensesClient, type DealExpenses } from "@/components/expenses/expenses-client";
import { BarList } from "@/components/ui/bar-list";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { EXPENSE_TYPE_LABELS } from "@/lib/labels";
import { formatMoney, monthlyCost, sumMonthly } from "@/lib/finance";
import { plural } from "@/lib/format";
import { Receipt, CalendarClock, Boxes } from "lucide-react";
import type { ExpenseType } from "@/generated/prisma/enums";

export default async function ExpensesPage() {
  await requireRole(["DIRECTOR"]);

  const deals = await prisma.deal.findMany({
    orderBy: { closedAt: "desc" },
    include: {
      lead: { include: { company: true } },
      expenses: { orderBy: { createdAt: "asc" } },
    },
  });

  const rows: DealExpenses[] = deals.map((d) => ({
    id: d.id,
    leadId: d.leadId,
    companyName: d.lead.company.name,
    website: d.lead.company.website,
    amount: d.amount,
    expenses: d.expenses.map((e) => ({
      id: e.id,
      type: e.type,
      name: e.name,
      url: e.url,
      amount: e.amount,
      period: e.period,
      renewsAt: e.renewsAt ? e.renewsAt.toISOString() : null,
      comment: e.comment,
    })),
  }));

  const allExpenses = deals.flatMap((d) => d.expenses);
  const monthlyTotal = sumMonthly(allExpenses);
  const projectsWithExpenses = deals.filter((d) => d.expenses.length > 0).length;

  const byType = new Map<ExpenseType, number>();
  for (const e of allExpenses) {
    byType.set(e.type, (byType.get(e.type) ?? 0) + monthlyCost(e));
  }
  const typeItems = [...byType.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, value]) => ({ label: EXPENSE_TYPE_LABELS[type], value }));

  return (
    <>
      <Topbar title="Расходы" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            icon={<Receipt />}
            label="Расходы в месяц"
            value={formatMoney(monthlyTotal)}
            tone="warning"
            hint={`${allExpenses.length} ${plural(allExpenses.length, ["позиция", "позиции", "позиций"])} по ${projectsWithExpenses} ${plural(projectsWithExpenses, ["проекту", "проектам", "проектам"])}`}
          />
          <StatCard
            icon={<CalendarClock />}
            label="В год"
            value={formatMoney(monthlyTotal * 12)}
            tone="neutral"
            hint="Годовые платежи учтены целиком"
          />
          <StatCard
            icon={<Boxes />}
            label="Проектов на обслуживании"
            value={projectsWithExpenses}
            tone="primary"
            hint={`Всего закрытых сделок: ${deals.length}`}
          />
        </div>

        {typeItems.length > 0 && (
          <Card className="mt-4">
            <CardHeader title="На что уходит в месяц" description="Сумма по всем проектам" />
            <CardBody>
              <BarList items={typeItems} formatValue={formatMoney} showShare />
            </CardBody>
          </Card>
        )}

        <div className="mt-4">
          <ExpensesClient deals={rows} />
        </div>
      </div>
    </>
  );
}
