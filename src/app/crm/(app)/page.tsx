import Link from "next/link";
import { startOfDay, endOfDay, subDays } from "date-fns";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/topbar";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { ActivityChart } from "@/components/ui/activity-chart";
import { StageDistributionBar } from "@/components/reports/stage-distribution-bar";
import { HrDashboard } from "@/components/dashboard/hr-dashboard";
import { bucketByDay } from "@/lib/chart-data";
import { canViewLeads } from "@/lib/permissions";
import { ownLeadsFilter, ownTasksFilter } from "@/lib/scope";
import { LEAD_STATUS_LABELS, LEAD_STATUS_TONE, PRIORITY_LABELS, PRIORITY_TONE, ACTIVITY_TYPE_LABELS } from "@/lib/labels";
import { formatRelativeDay, formatShortDate } from "@/lib/format";
import { UserPlus, CheckSquare, AlertTriangle, Briefcase, Send, Phone, StickyNote, ArrowRightLeft, Tag } from "lucide-react";
import type { LeadStatus } from "@/generated/prisma/enums";

const ACTIVITY_ICONS = {
  CALL: Phone,
  MESSAGE: StickyNote,
  EMAIL: StickyNote,
  MEETING: StickyNote,
  NOTE: StickyNote,
  STATUS_CHANGE: Tag,
  HANDOVER: ArrowRightLeft,
  FILE: StickyNote,
  REJECTION: AlertTriangle,
};

export default async function DashboardPage() {
  const user = await requireUser();

  // У отдела кадров своя главная — про найм, без лидов и клиентов.
  if (!canViewLeads(user.role)) {
    return (
      <>
        <Topbar title={`Здравствуйте, ${user.firstName}`} />
        <HrDashboard />
      </>
    );
  }

  const leadFilter = ownLeadsFilter(user);
  const taskFilter = ownTasksFilter(user);
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const [
    newLeadsToday,
    tasksToday,
    overdueTasks,
    leadsInProgress,
    handedOverCount,
    recentLeads,
    upcomingTasks,
    recentActivities,
    statusBreakdown,
    activityDates,
  ] = await Promise.all([
    prisma.lead.count({ where: { ...leadFilter, createdAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.task.count({
      where: { ...taskFilter, status: "PENDING", dueAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.task.count({ where: { ...taskFilter, status: "PENDING", dueAt: { lt: todayStart } } }),
    prisma.lead.count({ where: { ...leadFilter, status: { notIn: ["DEAL", "REJECTED"] } } }),
    prisma.lead.count({ where: { ...leadFilter, status: "HANDED_TO_MANAGER" } }),
    prisma.lead.findMany({
      where: leadFilter,
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { company: true, contact: true, owner: true },
    }),
    prisma.task.findMany({
      where: { ...taskFilter, status: "PENDING" },
      orderBy: { dueAt: "asc" },
      take: 5,
      include: { lead: { include: { company: true } } },
    }),
    prisma.leadActivity.findMany({
      where: user.role === "DIRECTOR" ? {} : { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { lead: { include: { company: true } }, user: true },
    }),
    prisma.lead.groupBy({ by: ["status"], where: leadFilter, _count: true }),
    prisma.leadActivity.findMany({
      where: {
        ...(user.role === "DIRECTOR" ? {} : { userId: user.id }),
        createdAt: { gte: subDays(startOfDay(new Date()), 13) },
      },
      select: { createdAt: true },
    }),
  ]);

  const statusCount = new Map(statusBreakdown.map((s) => [s.status, s._count]));
  const countOf = (statuses: LeadStatus[]) => statuses.reduce((sum, s) => sum + (statusCount.get(s) ?? 0), 0);

  const stageSegments = [
    { key: "new", label: "Новые", value: countOf(["NEW"]), barClass: "bg-neutral-400", dotClass: "bg-neutral-400" },
    {
      key: "working",
      label: "В работе",
      value: countOf(["SEARCHING_DM", "FIRST_CONTACT", "DM_FOUND", "QUALIFICATION", "CALLBACK_LATER"]),
      barClass: "bg-info-600",
      dotClass: "bg-info-600",
    },
    {
      key: "manager",
      label: "У руководителя",
      value: countOf(["HANDED_TO_MANAGER", "NEGOTIATION", "PROPOSAL_SENT"]),
      barClass: "bg-warning-600",
      dotClass: "bg-warning-600",
    },
    { key: "deal", label: "Сделки", value: countOf(["DEAL"]), barClass: "bg-success-600", dotClass: "bg-success-600" },
    { key: "rejected", label: "Отказы", value: countOf(["REJECTED"]), barClass: "bg-danger-600", dotClass: "bg-danger-600" },
  ];

  const totalLeads = stageSegments.reduce((sum, s) => sum + s.value, 0);
  const activityPoints = bucketByDay(activityDates.map((a) => a.createdAt), 14);

  return (
    <>
      <Topbar title={`Здравствуйте, ${user.firstName}`} />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <StatCard
            icon={<UserPlus />}
            label="Новые лиды сегодня"
            value={newLeadsToday}
            tone="primary"
            hint={`Всего лидов: ${totalLeads}`}
            href="/crm/leads"
          />
          <StatCard
            icon={<CheckSquare />}
            label="Задачи на сегодня"
            value={tasksToday}
            tone="info"
            hint={tasksToday === 0 ? "На сегодня задач нет" : "Запланировано на сегодня"}
            href="/crm/tasks"
          />
          <StatCard
            icon={<AlertTriangle />}
            label="Просроченные задачи"
            value={overdueTasks}
            tone={overdueTasks > 0 ? "danger" : "neutral"}
            hint={overdueTasks > 0 ? "Требуют внимания" : "Просроченных нет"}
            href="/crm/tasks"
          />
          <StatCard
            icon={<Briefcase />}
            label="Лиды в работе"
            value={leadsInProgress}
            tone="warning"
            hint={totalLeads > 0 ? `${Math.round((leadsInProgress / totalLeads) * 100)}% от всех лидов` : undefined}
            share={totalLeads > 0 ? leadsInProgress / totalLeads : 0}
          />
          <StatCard
            icon={<Send />}
            label="Передано руководителю"
            value={handedOverCount}
            tone="success"
            hint={totalLeads > 0 ? `${Math.round((handedOverCount / totalLeads) * 100)}% от всех лидов` : undefined}
            share={totalLeads > 0 ? handedOverCount / totalLeads : 0}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader
              title="Активность за 14 дней"
              description={user.role === "DIRECTOR" ? "Действия всех сотрудников по дням" : "Ваши звонки, сообщения и заметки по дням"}
            />
            <CardBody>
              <ActivityChart points={activityPoints} emptyLabel="За две недели активности не было" />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Лиды по этапам" description={user.role === "DIRECTOR" ? "Все лиды компании" : "Ваши лиды"} />
            <CardBody>
              <StageDistributionBar segments={stageSegments} />
            </CardBody>
          </Card>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader
              title="Последние лиды"
              action={
                <Link href="/crm/leads" className="text-[13px] font-medium text-primary-600 hover:text-primary-700">
                  Все лиды
                </Link>
              }
            />
            <CardBody className="p-0">
              {recentLeads.length === 0 ? (
                <EmptyState
                  icon={<UserPlus />}
                  title="Пока нет лидов"
                  description="Создайте первый лид, чтобы начать работу"
                />
              ) : (
                <div className="divide-y divide-border-subtle">
                  {recentLeads.map((lead) => (
                    <Link
                      key={lead.id}
                      href={`/crm/leads/${lead.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-hover"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-text-primary">{lead.company.name}</p>
                        <p className="truncate text-xs text-text-tertiary">
                          {lead.contact ? `${lead.contact.firstName} ${lead.contact.lastName ?? ""}` : "Контакт не указан"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge tone={PRIORITY_TONE[lead.priority]}>{PRIORITY_LABELS[lead.priority]}</Badge>
                        <Badge tone={LEAD_STATUS_TONE[lead.status]}>{LEAD_STATUS_LABELS[lead.status]}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Ближайшие задачи"
              action={
                <Link href="/crm/tasks" className="text-[13px] font-medium text-primary-600 hover:text-primary-700">
                  Все задачи
                </Link>
              }
            />
            <CardBody className="p-0">
              {upcomingTasks.length === 0 ? (
                <EmptyState icon={<CheckSquare />} title="Нет предстоящих задач" />
              ) : (
                <div className="divide-y divide-border-subtle">
                  {upcomingTasks.map((task) => (
                    <div key={task.id} className="px-5 py-3">
                      <p className="text-[13px] font-medium text-text-primary">{task.title}</p>
                      <p className="mt-0.5 truncate text-xs text-text-tertiary">
                        {task.lead ? task.lead.company.name : "Без привязки к лиду"} · {formatShortDate(task.dueAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <Card className="mt-4">
          <CardHeader title="Последние активности" />
          <CardBody className="p-0">
            {recentActivities.length === 0 ? (
              <EmptyState icon={<StickyNote />} title="Пока нет активности" />
            ) : (
              <div className="divide-y divide-border-subtle">
                {recentActivities.map((activity) => {
                  const Icon = ACTIVITY_ICONS[activity.type];
                  return (
                    <Link
                      key={activity.id}
                      href={activity.lead ? `/crm/leads/${activity.lead.id}` : "#"}
                      className="flex items-start gap-3 px-5 py-3 hover:bg-surface-hover"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-text-primary">
                          <Avatar
                            firstName={activity.user.firstName}
                            lastName={activity.user.lastName}
                            size="xs"
                            className="mr-1.5 inline-flex align-middle"
                          />
                          <span className="font-medium">
                            {activity.user.firstName} {activity.user.lastName}
                          </span>{" "}
                          — {ACTIVITY_TYPE_LABELS[activity.type]}
                          {activity.lead && <span className="text-text-tertiary"> · {activity.lead.company.name}</span>}
                        </p>
                        {activity.comment && (
                          <p className="mt-0.5 truncate text-xs text-text-secondary">{activity.comment}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-text-tertiary">{formatRelativeDay(activity.createdAt)}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
