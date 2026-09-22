import Link from "next/link";
import { startOfDay, endOfDay } from "date-fns";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/topbar";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { ownLeadsFilter, ownTasksFilter } from "@/lib/scope";
import { LEAD_STATUS_LABELS, LEAD_STATUS_TONE, PRIORITY_LABELS, PRIORITY_TONE, ACTIVITY_TYPE_LABELS } from "@/lib/labels";
import { formatRelativeDay, formatShortDate } from "@/lib/format";
import { UserPlus, CheckSquare, AlertTriangle, Briefcase, Send, Phone, StickyNote, ArrowRightLeft, Tag } from "lucide-react";

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
  ]);

  return (
    <>
      <Topbar title={`Здравствуйте, ${user.firstName}`} />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <StatCard icon={<UserPlus />} label="Новые лиды сегодня" value={newLeadsToday} tone="primary" />
          <StatCard icon={<CheckSquare />} label="Задачи на сегодня" value={tasksToday} tone="neutral" />
          <StatCard icon={<AlertTriangle />} label="Просроченные задачи" value={overdueTasks} tone="danger" />
          <StatCard icon={<Briefcase />} label="Лиды в работе" value={leadsInProgress} tone="warning" />
          <StatCard icon={<Send />} label="Передано менеджеру" value={handedOverCount} tone="success" />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
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
