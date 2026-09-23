import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { BarList } from "@/components/ui/bar-list";
import { FunnelChart } from "@/components/ui/funnel-chart";
import { ActivityChart } from "@/components/ui/activity-chart";
import { StageDistributionBar } from "@/components/reports/stage-distribution-bar";
import { bucketByDay } from "@/lib/chart-data";
import { PeriodPicker } from "@/components/reports/period-picker";
import { LEAD_SOURCE_LABELS, REJECTION_REASON_LABELS } from "@/lib/labels";
import { UserPlus, Search, CheckCircle2, ClipboardCheck, Send, Handshake, XCircle } from "lucide-react";
import type { LeadSource, RejectionReason, LeadStatus } from "@/generated/prisma/enums";
import { describeAuditLog } from "@/lib/audit-labels";
import { formatDateTime } from "@/lib/format";

function getPeriodRange(period: string, from?: string, to?: string) {
  const now = new Date();
  if (period === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }
  if (period === "week") {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return { start, end: now };
  }
  if (period === "month") {
    const start = new Date(now);
    start.setMonth(start.getMonth() - 1);
    return { start, end: now };
  }
  if (period === "custom" && from) {
    return { start: new Date(from), end: to ? new Date(to + "T23:59:59") : now };
  }
  const start = new Date(now);
  start.setMonth(start.getMonth() - 1);
  return { start, end: now };
}

const STAGE_GROUPS: { key: string; label: string; statuses: LeadStatus[]; barClass: string; dotClass: string }[] = [
  { key: "new", label: "Новые", statuses: ["NEW"], barClass: "bg-neutral-400", dotClass: "bg-neutral-400" },
  {
    key: "working",
    label: "В работе",
    statuses: ["SEARCHING_DM", "FIRST_CONTACT", "DM_FOUND", "QUALIFICATION", "CALLBACK_LATER"],
    barClass: "bg-info-600",
    dotClass: "bg-info-600",
  },
  {
    key: "manager",
    label: "У руководителя",
    statuses: ["HANDED_TO_MANAGER", "NEGOTIATION", "PROPOSAL_SENT"],
    barClass: "bg-warning-600",
    dotClass: "bg-warning-600",
  },
  { key: "deal", label: "Сделки", statuses: ["DEAL"], barClass: "bg-success-600", dotClass: "bg-success-600" },
  { key: "rejected", label: "Отказы", statuses: ["REJECTED"], barClass: "bg-danger-600", dotClass: "bg-danger-600" },
];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  await requireRole(["DIRECTOR"]);
  const params = await searchParams;
  const period = params.period ?? "month";
  const { start, end } = getPeriodRange(period, params.from, params.to);
  const dateFilter = { createdAt: { gte: start, lte: end } };

  const [
    newLeads,
    processedLeads,
    dmFound,
    qualified,
    handedOver,
    deals,
    rejected,
    rejectionBreakdown,
    sourceBreakdown,
    statusBreakdown,
    employeeStats,
  ] = await Promise.all([
    prisma.lead.count({ where: dateFilter }),
    prisma.lead.count({ where: { ...dateFilter, status: { not: "NEW" } } }),
    prisma.lead.count({ where: { ...dateFilter, dmStatus: { in: ["FOUND", "PARTICIPATES", "MULTIPLE"] } } }),
    prisma.lead.count({ where: { ...dateFilter, needLevel: { in: ["POTENTIAL", "CONFIRMED"] } } }),
    prisma.lead.count({ where: { handedToManagerAt: { gte: start, lte: end } } }),
    prisma.lead.count({ where: { ...dateFilter, status: "DEAL" } }),
    prisma.lead.count({ where: { ...dateFilter, status: "REJECTED" } }),
    prisma.lead.groupBy({
      by: ["rejectionReason"],
      where: { ...dateFilter, status: "REJECTED" },
      _count: true,
    }),
    prisma.lead.groupBy({
      by: ["source"],
      where: dateFilter,
      _count: true,
    }),
    prisma.lead.groupBy({
      by: ["status"],
      where: dateFilter,
      _count: true,
    }),
    prisma.user.findMany({
      where: { deletedAt: null, role: { in: ["OPERATOR", "HR_OPERATOR"] } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        _count: {
          select: {
            leadsCreated: { where: dateFilter },
          },
        },
      },
    }),
  ]);

  const sourceDeals = await prisma.lead.groupBy({
    by: ["source"],
    where: { ...dateFilter, status: "DEAL" },
    _count: true,
  });

  const dealsBySourceMap = new Map(sourceDeals.map((s) => [s.source, s._count]));
  const statusCountMap = new Map(statusBreakdown.map((s) => [s.status, s._count]));

  const leadDates = await prisma.lead.findMany({
    where: dateFilter,
    select: { createdAt: true },
  });

  const auditLogs = await prisma.auditLog.findMany({
    where: dateFilter,
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  const funnelSteps = [
    { key: "new", label: "Новые лиды", value: newLeads },
    { key: "processed", label: "Взяты в работу", value: processedLeads },
    { key: "dm", label: "Найден ЛПР", value: dmFound },
    { key: "qualified", label: "Квалифицированы", value: qualified },
    { key: "handed", label: "Переданы руководителю", value: handedOver },
    { key: "deal", label: "Сделки", value: deals },
  ];

  const leadsPerDay = bucketByDay(leadDates.map((l) => l.createdAt), 14);

  // Доля шага от всех новых лидов периода — одинаковая база у всех плиток.
  const shareOfNew = (value: number) =>
    newLeads > 0 ? `${Math.round((value / newLeads) * 100)}% от новых` : undefined;

  const stageSegments = STAGE_GROUPS.map((group) => ({
    key: group.key,
    label: group.label,
    barClass: group.barClass,
    dotClass: group.dotClass,
    value: group.statuses.reduce((sum, s) => sum + (statusCountMap.get(s) ?? 0), 0),
  }));

  const rejectionItems = rejectionBreakdown
    .sort((a, b) => b._count - a._count)
    .map((r) => ({ label: REJECTION_REASON_LABELS[r.rejectionReason as RejectionReason], value: r._count }));

  const sourceItems = sourceBreakdown
    .sort((a, b) => b._count - a._count)
    .map((s) => {
      const dealsCount = dealsBySourceMap.get(s.source) ?? 0;
      const rate = s._count > 0 ? Math.round((dealsCount / s._count) * 100) : 0;
      return {
        label: LEAD_SOURCE_LABELS[s.source as LeadSource],
        value: s._count,
        sublabel: `конверсия в сделку ${rate}%`,
      };
    });

  const employeeItems = employeeStats
    .map((e) => ({ label: `${e.firstName} ${e.lastName}`, value: e._count.leadsCreated }))
    .sort((a, b) => b.value - a.value);

  return (
    <>
      <Topbar title="Отчёты" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mb-5">
          <PeriodPicker />
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          <StatCard icon={<UserPlus />} label="Новые лиды" value={newLeads} tone="primary" hint="База периода" />
          <StatCard
            icon={<Search />}
            label="Обработанные"
            value={processedLeads}
            tone="info"
            hint={shareOfNew(processedLeads)}
            share={newLeads > 0 ? processedLeads / newLeads : 0}
          />
          <StatCard
            icon={<CheckCircle2 />}
            label="Найдены ЛПР"
            value={dmFound}
            tone="info"
            hint={shareOfNew(dmFound)}
            share={newLeads > 0 ? dmFound / newLeads : 0}
          />
          <StatCard
            icon={<ClipboardCheck />}
            label="Квалифицированные"
            value={qualified}
            tone="primary"
            hint={shareOfNew(qualified)}
            share={newLeads > 0 ? qualified / newLeads : 0}
          />
          <StatCard
            icon={<Send />}
            label="Переданы руководителю"
            value={handedOver}
            tone="warning"
            hint={shareOfNew(handedOver)}
            share={newLeads > 0 ? handedOver / newLeads : 0}
          />
          <StatCard
            icon={<Handshake />}
            label="Сделки"
            value={deals}
            tone="success"
            hint={shareOfNew(deals)}
            share={newLeads > 0 ? deals / newLeads : 0}
          />
          <StatCard
            icon={<XCircle />}
            label="Отказы"
            value={rejected}
            tone="danger"
            hint={shareOfNew(rejected)}
            share={newLeads > 0 ? rejected / newLeads : 0}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Воронка квалификации"
              description="Сколько лидов доходит до каждого шага и где они теряются"
            />
            <CardBody>
              <FunnelChart steps={funnelSteps} />
            </CardBody>
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader title="Новые лиды по дням" description="Последние 14 дней" />
              <CardBody>
                <ActivityChart points={leadsPerDay} valueLabel="лидов" emptyLabel="За две недели новых лидов не было" />
              </CardBody>
            </Card>

            <Card className="flex-1">
              <CardHeader title="Лиды по этапам воронки" description="Распределение лидов, созданных за период" />
              <CardBody>
                <StageDistributionBar segments={stageSegments} />
              </CardBody>
            </Card>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Причины отказов" />
            <CardBody>
              <BarList items={rejectionItems} emptyLabel="Нет отказов за период" showShare />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Эффективность источников" description="Количество лидов и конверсия в сделку" />
            <CardBody>
              <BarList items={sourceItems} showShare />
            </CardBody>
          </Card>
        </div>

        <Card className="mt-4">
          <CardHeader title="Лиды по сотрудникам" description="Создано новых лидов за период" />
          <CardBody>
            <BarList items={employeeItems} />
          </CardBody>
        </Card>

        <Card className="mt-4">
          <CardHeader title="Журнал аудита" description="Важные действия сотрудников за период" />
          <CardBody className="p-0">
            {auditLogs.length === 0 ? (
              <p className="px-5 py-4 text-[13px] text-text-tertiary">Событий за период нет</p>
            ) : (
              <div className="max-h-96 divide-y divide-border-subtle overflow-y-auto">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-[13px]">
                    <span className="text-text-primary">
                      <span className="font-medium">{log.actorName}</span> {describeAuditLog(log)}
                    </span>
                    <span className="shrink-0 text-xs text-text-tertiary">{formatDateTime(log.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
