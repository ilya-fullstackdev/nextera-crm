import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { ActivityChart } from "@/components/ui/activity-chart";
import { StageDistributionBar } from "@/components/reports/stage-distribution-bar";
import { bucketByMonth } from "@/lib/chart-data";
import { COLD_CALL_ROLES } from "@/lib/permissions";
import { ROLE_LABELS, ROLE_TONE, USER_STATUS_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { Users2, UserPlus, UserCheck, UserX } from "lucide-react";
import { subDays } from "date-fns";

/** Главная для отдела кадров: найм в отдел холодных звонков, без единого лида. */
export async function HrDashboard() {
  const monthAgo = subDays(new Date(), 30);

  const staff = await prisma.user.findMany({
    where: { deletedAt: null, role: { in: COLD_CALL_ROLES } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      login: true,
      role: true,
      status: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  const active = staff.filter((u) => u.status === "ACTIVE");
  const blocked = staff.filter((u) => u.status === "BLOCKED");
  const hiredThisMonth = staff.filter((u) => u.createdAt >= monthAgo);
  const neverLoggedIn = active.filter((u) => !u.lastLoginAt);

  const hiringByMonth = bucketByMonth(staff.map((u) => u.createdAt), 6);

  const roleSegments = [
    {
      key: "operator",
      label: ROLE_LABELS.OPERATOR,
      value: staff.filter((u) => u.role === "OPERATOR").length,
      barClass: "bg-info-600",
      dotClass: "bg-info-600",
    },
    {
      key: "hr_operator",
      label: ROLE_LABELS.HR_OPERATOR,
      value: staff.filter((u) => u.role === "HR_OPERATOR").length,
      barClass: "bg-warning-600",
      dotClass: "bg-warning-600",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<Users2 />}
          label="В отделе холодных звонков"
          value={staff.length}
          tone="primary"
          hint="Всего заведённых сотрудников"
          href="/crm/employees"
        />
        <StatCard
          icon={<UserCheck />}
          label="Работают сейчас"
          value={active.length}
          tone="success"
          hint={staff.length > 0 ? `${Math.round((active.length / staff.length) * 100)}% состава` : undefined}
          share={staff.length > 0 ? active.length / staff.length : 0}
        />
        <StatCard
          icon={<UserPlus />}
          label="Наняты за 30 дней"
          value={hiredThisMonth.length}
          tone="info"
          hint="Новые сотрудники в отделе"
        />
        <StatCard
          icon={<UserX />}
          label="Заблокированы"
          value={blocked.length}
          tone={blocked.length > 0 ? "danger" : "neutral"}
          hint="Доступ в CRM закрыт"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Найм по месяцам" description="Сколько человек завели в отдел за последние 6 месяцев" />
          <CardBody>
            <ActivityChart points={hiringByMonth} valueLabel="чел." emptyLabel="За полгода никого не нанимали" />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Состав отдела" description="По должностям" />
          <CardBody>
            <StageDistributionBar segments={roleSegments} />
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Последние нанятые"
            action={
              <Link href="/crm/employees" className="text-[13px] font-medium text-primary-600 hover:text-primary-700">
                Все сотрудники
              </Link>
            }
          />
          <CardBody className="p-0">
            {staff.length === 0 ? (
              <EmptyState
                icon={<UserPlus />}
                title="В отделе пока никого нет"
                description="Заведите первого сотрудника в разделе «Сотрудники»"
              />
            ) : (
              <div className="divide-y divide-border-subtle">
                {staff.slice(0, 6).map((u) => (
                  <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar firstName={u.firstName} lastName={u.lastName} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-text-primary">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="truncate text-xs text-text-tertiary">
                          {u.login} · принят {formatDate(u.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Badge tone={ROLE_TONE[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Ещё ни разу не входили" description="Стоит проверить, получил ли человек доступ" />
          <CardBody className="p-0">
            {neverLoggedIn.length === 0 ? (
              <EmptyState icon={<UserCheck />} title="Все сотрудники заходили в CRM" />
            ) : (
              <div className="divide-y divide-border-subtle">
                {neverLoggedIn.map((u) => (
                  <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-text-primary">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="truncate text-xs text-text-tertiary">Логин: {u.login}</p>
                    </div>
                    <Badge tone="warning">{USER_STATUS_LABELS[u.status]}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
