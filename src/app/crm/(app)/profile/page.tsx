import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/labels";
import { formatDate, formatDateTime } from "@/lib/format";
import { ChangePasswordForm } from "@/components/profile/change-password-form";

export default async function ProfilePage() {
  const user = await requireUser();
  const full = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

  const [totalLeads, activeLeads, handedOverLeads, closedDeals] = await Promise.all([
    prisma.lead.count({ where: { ownerId: user.id } }),
    prisma.lead.count({ where: { ownerId: user.id, status: { notIn: ["DEAL", "REJECTED"] } } }),
    prisma.leadHandover.count({ where: { fromUserId: user.id } }),
    prisma.lead.count({ where: { ownerId: user.id, status: "DEAL" } }),
  ]);

  const stats = [
    { label: "Всего лидов", value: totalLeads },
    { label: "Активные лиды", value: activeLeads },
    { label: "Переданные лиды", value: handedOverLeads },
    { label: "Закрытые сделки", value: closedDeals },
  ];

  return (
    <>
      <Topbar title="Мой профиль" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <Card>
            <CardBody className="flex items-center gap-4">
              <Avatar firstName={full.firstName} lastName={full.lastName} size="lg" />
              <div>
                <p className="text-[15px] font-semibold text-text-primary">
                  {full.firstName} {full.lastName}
                </p>
                <p className="text-[13px] text-text-tertiary">@{full.login}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <Badge tone="primary">{ROLE_LABELS[full.role]}</Badge>
                  <Badge tone={full.status === "ACTIVE" ? "success" : "danger"} dot>
                    {USER_STATUS_LABELS[full.status]}
                  </Badge>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Информация об аккаунте" />
            <CardBody className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-text-tertiary">Дата регистрации</p>
                <p className="text-[13px] text-text-primary">{formatDate(full.createdAt)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-text-tertiary">Последний вход</p>
                <p className="text-[13px] text-text-primary">
                  {full.lastLoginAt ? formatDateTime(full.lastLoginAt) : "—"}
                </p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Статистика" />
            <CardBody className="grid grid-cols-4 gap-3">
              {stats.map((s) => (
                <div key={s.label} className="rounded-md border border-border-subtle p-3 text-center">
                  <p className="text-lg font-semibold tabular-nums text-text-primary">{s.value}</p>
                  <p className="mt-0.5 text-[11px] text-text-secondary">{s.label}</p>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Изменить пароль" />
            <CardBody>
              <ChangePasswordForm />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
