import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { BarList } from "@/components/ui/bar-list";
import { StageDistributionBar } from "@/components/reports/stage-distribution-bar";
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
  { key: "new", label: "Новые", statuses: ["NEW"], barClass: "bg-neutral-300", dotClass: "bg-neutral-300" },
  {
    key: "working",
    label: "В работе",
    statuses: ["SEARCHING_DM", "FIRST_CONTACT", "DM_FOUND", "QUALIFICATION", "CALLBACK_LATER"],
    barClass: "bg-primary-500",
    dotClass: "bg-primary-500",
  },
  {
    key: "manager",
    label: "У менеджера",
    statuses: ["HANDED_TO_MANAGER", "NEGOTIATION", "PROPOSAL_SENT"],
    barClass: "bg-warning-500",
    dotClass: "bg-warning-500",
  },
  { key: "deal", label: "Сделки", statuses: ["DEAL"], barClass: "bg-success-500", dotClass: "bg-success-500" },
  { key: "rejected", label: "Отказы", statuses: ["REJECTED"], barClass: "bg-danger-500", dotClass: "bg-danger-500" },
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
      where: { deletedAt: null, role: { in: ["OPERATOR", "MANAGER"] } },
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

  const auditLogs = await prisma.auditLog.findMany({
    where: dateFilter,
    orderBy: { createdAt: "desc" },
    take: 40,
  });

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
          <StatCard icon={<UserPlus />} label="Новые лиды" value={newLeads} tone="primary" />
          <StatCard icon={<Search />} label="Обработанные" value={processedLeads} tone="neutral" />
          <StatCard icon={<CheckCircle2 />} label="Найдены ЛПР" value={dmFound} tone="primary" />
          <StatCard icon={<ClipboardCheck />} label="Квалифицированные" value={qualified} tone="primary" />
          <StatCard icon={<Send />} label="Переданы менеджерам" value={handedOver} tone="warning" />
          <StatCard icon={<Handshake />} label="Сделки" value={deals} tone="success" />
          <StatCard icon={<XCircle />} label="Отказы" value={rejected} tone="danger" />
        </div>

        <Card className="mt-4">
          <CardHeader title="Лиды по этапам воронки" description="Распределение лидов, созданных за период" />
          <CardBody>
            <StageDistributionBar segments={stageSegments} />
          </CardBody>
        </Card>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Причины отказов" />
            <CardBody>
              <BarList items={rejectionItems} emptyLabel="Нет отказов за период" />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Эффективность источников" description="Количество лидов и конверсия в сделку" />
            <CardBody>
              <BarList items={sourceItems} />
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
