"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, MoreHorizontal, Pencil, Lock, Unlock, KeyRound, Trash2, Users2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FabButton } from "@/components/ui/fab-button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Table, type Column } from "@/components/ui/table";
import { Dropdown } from "@/components/ui/dropdown";
import type { ContextMenuItem } from "@/components/ui/context-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { ROLE_LABELS, ROLE_TONE, USER_STATUS_LABELS } from "@/lib/labels";
import { canManageRole } from "@/lib/permissions";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Role, UserStatus } from "@/generated/prisma/enums";
import { EmployeeFormModal } from "@/components/employees/employee-form-modal";
import { DeleteEmployeeModal } from "@/components/employees/delete-employee-modal";
import { ResetPasswordModal } from "@/components/employees/reset-password-modal";

export interface EmployeeRow {
  id: string;
  firstName: string;
  lastName: string;
  login: string;
  role: Role;
  status: UserStatus;
  hiredById: string | null;
  hiredByName: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  activeLeads: number;
  handedOverLeads: number;
}

export function EmployeesClient({
  initialEmployees,
  currentUserId,
  actorRole,
  showLeadStats,
}: {
  initialEmployees: EmployeeRow[];
  currentUserId: string;
  actorRole: Role;
  showLeadStats: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [formState, setFormState] = useState<{ open: boolean; employee: EmployeeRow | null }>({
    open: false,
    employee: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<EmployeeRow | null>(null);
  const [resetTarget, setResetTarget] = useState<EmployeeRow | null>(null);

  async function toggleStatus(employee: EmployeeRow) {
    const nextStatus = employee.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";
    const res = await fetch(`/api/employees/${employee.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error("Не удалось изменить статус", data.error);
      return;
    }
    toast.success(
      nextStatus === "BLOCKED" ? "Сотрудник заблокирован" : "Сотрудник активирован",
      `${employee.firstName} ${employee.lastName}`
    );
    router.refresh();
  }

  async function copyLogin(e: EmployeeRow) {
    await navigator.clipboard.writeText(e.login);
    toast.success("Логин скопирован", e.login);
  }

  function buildActions(e: EmployeeRow): ContextMenuItem[] {
    // Кадровик управляет только отделом холодных звонков.
    const manageable = canManageRole(actorRole, e.role);
    return [
      {
        label: "Редактировать",
        icon: <Pencil />,
        onClick: () => setFormState({ open: true, employee: e }),
        disabled: !manageable,
      },
      { label: "Копировать логин", icon: <Copy />, onClick: () => copyLogin(e) },
      {
        label: e.status === "ACTIVE" ? "Заблокировать" : "Активировать",
        icon: e.status === "ACTIVE" ? <Lock /> : <Unlock />,
        onClick: () => toggleStatus(e),
        disabled: e.id === currentUserId || !manageable,
      },
      {
        label: "Сбросить пароль",
        icon: <KeyRound />,
        onClick: () => setResetTarget(e),
        disabled: !manageable,
      },
      {
        label: "Удалить",
        icon: <Trash2 />,
        danger: true,
        onClick: () => setDeleteTarget(e),
        disabled: e.id === currentUserId || !manageable,
      },
    ];
  }

  const leadColumns: Column<EmployeeRow>[] = showLeadStats
    ? [
        {
          key: "activeLeads",
          header: "Активные лиды",
          render: (e) => <span className="tabular-nums">{e.activeLeads}</span>,
        },
        {
          key: "handedOverLeads",
          header: "Переданные лиды",
          render: (e) => <span className="tabular-nums">{e.handedOverLeads}</span>,
        },
      ]
    : [];

  const columns: Column<EmployeeRow>[] = [
    {
      key: "name",
      header: "Сотрудник",
      render: (e) => (
        <div className="flex items-center gap-2.5">
          <Avatar firstName={e.firstName} lastName={e.lastName} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-text-primary">
              {e.firstName} {e.lastName}
            </p>
            <p className="truncate text-xs text-text-tertiary">{e.login}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Роль",
      render: (e) => <Badge tone={ROLE_TONE[e.role]}>{ROLE_LABELS[e.role]}</Badge>,
    },
    {
      key: "status",
      header: "Статус",
      render: (e) => (
        <Badge tone={e.status === "ACTIVE" ? "success" : "danger"} dot>
          {USER_STATUS_LABELS[e.status]}
        </Badge>
      ),
    },
    {
      key: "hiredBy",
      header: "Кто привёл",
      render: (e) => <span className="text-text-secondary">{e.hiredByName ?? "—"}</span>,
    },
    {
      key: "createdAt",
      header: "Дата создания",
      render: (e) => <span className="text-text-secondary">{formatDate(e.createdAt)}</span>,
    },
    {
      key: "lastLoginAt",
      header: "Последний вход",
      render: (e) => (
        <span className="text-text-secondary">
          {e.lastLoginAt ? formatDateTime(e.lastLoginAt) : "Ещё не входил"}
        </span>
      ),
    },
    ...leadColumns,
    {
      key: "actions",
      header: "",
      className: "w-10",
      render: (e) => (
        <Dropdown
          trigger={
            <button className="rounded-md p-1.5 text-text-tertiary hover:bg-surface-hover hover:text-text-primary">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          }
          items={buildActions(e)}
        />
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[13px] text-text-secondary">Всего сотрудников: {initialEmployees.length}</p>
        <div className="hidden md:block">
          <Button
            variant="primary"
            icon={<Plus />}
            onClick={() => setFormState({ open: true, employee: null })}
          >
            Добавить сотрудника
          </Button>
        </div>
      </div>
      <FabButton label="Добавить сотрудника" onClick={() => setFormState({ open: true, employee: null })} />

      <div className="hidden rounded-lg border border-border-subtle bg-white shadow-xs md:block">
        <Table
          columns={columns}
          rows={initialEmployees}
          rowKey={(e) => e.id}
          contextMenuItems={buildActions}
          emptyState={
            <EmptyState
              icon={<Users2 />}
              title="Пока нет сотрудников"
              description="Добавьте первого сотрудника, чтобы начать работу"
            />
          }
        />
      </div>

      <div className="space-y-2.5 md:hidden">
        {initialEmployees.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={<Users2 />}
              title="Пока нет сотрудников"
              description="Добавьте первого сотрудника, чтобы начать работу"
            />
          </div>
        ) : (
          initialEmployees.map((e) => (
            <div key={e.id} className="rounded-lg border border-border-subtle bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar firstName={e.firstName} lastName={e.lastName} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-text-primary">
                      {e.firstName} {e.lastName}
                    </p>
                    <p className="truncate text-xs text-text-tertiary">{e.login}</p>
                  </div>
                </div>
                <Dropdown
                  trigger={
                    <button className="-m-2 rounded-md p-2 text-text-tertiary hover:bg-surface-hover hover:text-text-primary">
                      <MoreHorizontal className="h-4.5 w-4.5" />
                    </button>
                  }
                  items={buildActions(e)}
                />
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <Badge tone={ROLE_TONE[e.role]}>{ROLE_LABELS[e.role]}</Badge>
                <Badge tone={e.status === "ACTIVE" ? "success" : "danger"} dot>
                  {USER_STATUS_LABELS[e.status]}
                </Badge>
              </div>

              {showLeadStats ? (
                <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-2.5 text-[12px] text-text-tertiary">
                  <span>Активных лидов: {e.activeLeads}</span>
                  <span>Передано: {e.handedOverLeads}</span>
                </div>
              ) : (
                <div className="mt-3 border-t border-border-subtle pt-2.5 text-[12px] text-text-tertiary">
                  Последний вход: {e.lastLoginAt ? formatDateTime(e.lastLoginAt) : "ещё не входил"}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <EmployeeFormModal
        open={formState.open}
        employee={formState.employee}
        actorRole={actorRole}
        onClose={() => setFormState({ open: false, employee: null })}
        onSuccess={() => {
          setFormState({ open: false, employee: null });
          router.refresh();
        }}
      />

      <DeleteEmployeeModal
        employee={deleteTarget}
        colleagues={initialEmployees.filter((e) => e.id !== deleteTarget?.id && e.status === "ACTIVE")}
        onClose={() => setDeleteTarget(null)}
        onSuccess={() => {
          setDeleteTarget(null);
          router.refresh();
        }}
      />

      <ResetPasswordModal employee={resetTarget} onClose={() => setResetTarget(null)} />
    </div>
  );
}
