"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Users2, ExternalLink, Trash2, Flag, MoreVertical } from "lucide-react";
import { Table, type Column } from "@/components/ui/table";
import type { ContextMenuItem } from "@/components/ui/context-menu";
import { Dropdown } from "@/components/ui/dropdown";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDeleteModal } from "@/components/shared/confirm-delete-modal";
import { useToast } from "@/components/ui/toast";
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_TONE,
  PRIORITY_LABELS,
  PRIORITY_TONE,
  LEAD_SOURCE_LABELS,
  ACTIVITY_TYPE_LABELS,
} from "@/lib/labels";
import { formatShortDate, formatRelativeDay } from "@/lib/format";
import type { Role } from "@/generated/prisma/enums";

export interface LeadListItem {
  id: string;
  status: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  source: string;
  nextContactAt: Date | null;
  company: { name: string };
  contact: { firstName: string; lastName: string | null; position: string | null; phone: string | null } | null;
  owner: { firstName: string; lastName: string };
  activities: { type: string; createdAt: Date }[];
}

export function LeadsTable({ leads, currentUserRole }: { leads: LeadListItem[]; currentUserRole?: Role }) {
  const router = useRouter();
  const toast = useToast();
  const [deleteTarget, setDeleteTarget] = useState<LeadListItem | null>(null);

  async function setPriority(lead: LeadListItem, priority: "LOW" | "MEDIUM" | "HIGH") {
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority }),
    });
    if (!res.ok) {
      toast.error("Не удалось изменить приоритет");
      return;
    }
    toast.success("Приоритет изменён", `${lead.company.name} → ${PRIORITY_LABELS[priority]}`);
    router.refresh();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/leads/${deleteTarget.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error("Не удалось удалить лид", data.error);
      return;
    }
    toast.success("Лид удалён", deleteTarget.company.name);
    setDeleteTarget(null);
    router.refresh();
  }

  const columns: Column<LeadListItem>[] = [
    {
      key: "company",
      header: "Компания",
      render: (l) => <span className="font-medium text-text-primary">{l.company.name}</span>,
    },
    {
      key: "contact",
      header: "Контакт",
      render: (l) => (l.contact ? `${l.contact.firstName} ${l.contact.lastName ?? ""}` : "—"),
    },
    { key: "position", header: "Должность", render: (l) => l.contact?.position ?? "—" },
    {
      key: "phone",
      header: "Телефон",
      render: (l) =>
        l.contact?.phone ? (
          <span className="flex items-center gap-1.5 text-text-secondary">
            <Phone className="h-3.5 w-3.5" />
            {l.contact.phone}
          </span>
        ) : (
          "—"
        ),
    },
    {
      key: "status",
      header: "Статус",
      render: (l) => (
        <Badge tone={LEAD_STATUS_TONE[l.status as keyof typeof LEAD_STATUS_TONE]}>
          {LEAD_STATUS_LABELS[l.status as keyof typeof LEAD_STATUS_LABELS]}
        </Badge>
      ),
    },
    {
      key: "priority",
      header: "Приоритет",
      render: (l) => <Badge tone={PRIORITY_TONE[l.priority]}>{PRIORITY_LABELS[l.priority]}</Badge>,
    },
    {
      key: "owner",
      header: "Ответственный",
      render: (l) => (
        <span className="flex items-center gap-2">
          <Avatar firstName={l.owner.firstName} lastName={l.owner.lastName} size="xs" />
          <span className="whitespace-nowrap">
            {l.owner.firstName} {l.owner.lastName}
          </span>
        </span>
      ),
    },
    {
      key: "nextContactAt",
      header: "Следующий контакт",
      render: (l) => (l.nextContactAt ? formatShortDate(l.nextContactAt) : "—"),
    },
    {
      key: "source",
      header: "Источник",
      render: (l) => LEAD_SOURCE_LABELS[l.source as keyof typeof LEAD_SOURCE_LABELS],
    },
    {
      key: "lastActivity",
      header: "Последняя активность",
      render: (l) =>
        l.activities[0] ? (
          <span className="text-text-tertiary">
            {ACTIVITY_TYPE_LABELS[l.activities[0].type as keyof typeof ACTIVITY_TYPE_LABELS]} ·{" "}
            {formatRelativeDay(l.activities[0].createdAt)}
          </span>
        ) : (
          "—"
        ),
    },
  ];

  function buildContextMenu(lead: LeadListItem): ContextMenuItem[] {
    const items: ContextMenuItem[] = [
      { label: "Открыть карточку", icon: <ExternalLink />, onClick: () => router.push(`/crm/leads/${lead.id}`) },
    ];
    (["HIGH", "MEDIUM", "LOW"] as const).forEach((p) => {
      items.push({
        label: `Приоритет: ${PRIORITY_LABELS[p]}${lead.priority === p ? " ✓" : ""}`,
        icon: <Flag />,
        onClick: () => setPriority(lead, p),
        disabled: lead.priority === p,
      });
    });
    if (currentUserRole === "DIRECTOR") {
      items.push({
        label: "Удалить лид",
        icon: <Trash2 />,
        danger: true,
        onClick: () => setDeleteTarget(lead),
      });
    }
    return items;
  }

  const emptyState = <EmptyState icon={<Users2 />} title="Лиды не найдены" description="Измените фильтры или создайте новый лид" />;

  return (
    <>
      <div className="hidden md:block">
        <Table
          columns={columns}
          rows={leads}
          rowKey={(l) => l.id}
          onRowClick={(l) => router.push(`/crm/leads/${l.id}`)}
          contextMenuItems={buildContextMenu}
          emptyState={emptyState}
        />
      </div>

      <div className="space-y-2.5 md:hidden">
        {leads.length === 0
          ? <div className="py-12">{emptyState}</div>
          : leads.map((lead) => (
              <div
                key={lead.id}
                onClick={() => router.push(`/crm/leads/${lead.id}`)}
                className="rounded-lg border border-border-subtle bg-white p-4 active:bg-surface-hover"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-text-primary">{lead.company.name}</p>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Dropdown
                      trigger={
                        <button className="-m-2 rounded-md p-2 text-text-tertiary hover:bg-surface-hover hover:text-text-primary">
                          <MoreVertical className="h-4.5 w-4.5" />
                        </button>
                      }
                      items={buildContextMenu(lead)}
                    />
                  </div>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge tone={LEAD_STATUS_TONE[lead.status as keyof typeof LEAD_STATUS_TONE]}>
                    {LEAD_STATUS_LABELS[lead.status as keyof typeof LEAD_STATUS_LABELS]}
                  </Badge>
                  <Badge tone={PRIORITY_TONE[lead.priority]}>{PRIORITY_LABELS[lead.priority]}</Badge>
                </div>

                {lead.contact && (
                  <p className="mt-2 truncate text-[13px] text-text-secondary">
                    {lead.contact.firstName} {lead.contact.lastName ?? ""}
                    {lead.contact.position ? ` · ${lead.contact.position}` : ""}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
                  <span className="flex min-w-0 items-center gap-1.5 text-[12px] text-text-tertiary">
                    <Avatar firstName={lead.owner.firstName} lastName={lead.owner.lastName} size="xs" />
                    <span className="truncate">
                      {lead.owner.firstName} {lead.owner.lastName}
                    </span>
                  </span>
                  {lead.contact?.phone && (
                    <a
                      href={`tel:${lead.contact.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="-m-2 flex shrink-0 items-center gap-1.5 rounded-md p-2 text-primary-600"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
      </div>

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Удаление лида"
        description={
          <>
            Вы уверены, что хотите удалить лид <span className="font-semibold">{deleteTarget?.company.name}</span>?
            Вся история звонков, задач и файлов будет удалена без возможности восстановления.
          </>
        }
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
