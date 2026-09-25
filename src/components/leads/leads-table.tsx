"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, isToday, isPast } from "date-fns";
import { ru } from "date-fns/locale";
import { Phone, PhoneCall, Users2, ExternalLink, Trash2, MoreVertical } from "lucide-react";
import { Table, type Column } from "@/components/ui/table";
import type { ContextMenuItem } from "@/components/ui/context-menu";
import { Dropdown } from "@/components/ui/dropdown";
import { Avatar } from "@/components/ui/avatar";
import { Tooltip } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDeleteModal } from "@/components/shared/confirm-delete-modal";
import { StatusBadge } from "@/components/leads/status-badge";
import { QuickCallModal } from "@/components/leads/quick-call-modal";
import { useToast } from "@/components/ui/toast";
import { formatRelativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Role } from "@/generated/prisma/enums";

export interface LeadListItem {
  id: string;
  status: string;
  nextContactAt: Date | null;
  company: { name: string };
  contact: { firstName: string; lastName: string | null; phone: string | null } | null;
  owner: { firstName: string; lastName: string };
  /** Последний звонок. */
  activities: { comment: string | null; createdAt: Date }[];
}

const CLOSED = ["REJECTED", "DEAL"];
const AT_MANAGER = ["HANDED_TO_MANAGER", "NEGOTIATION", "PROPOSAL_SENT"];

function contactName(l: LeadListItem) {
  return l.contact ? `${l.contact.firstName} ${l.contact.lastName ?? ""}`.trim() : null;
}

/** «Следующий звонок» с цветом: красный — просрочен, синий — сегодня. */
function NextCall({ lead, forManager }: { lead: LeadListItem; forManager?: boolean }) {
  if (CLOSED.includes(lead.status)) return <span className="text-text-tertiary">—</span>;
  // Оператору не нужно помнить про звонки руководителя.
  if (!forManager && AT_MANAGER.includes(lead.status)) return <span className="text-text-tertiary">Звонит руководитель</span>;
  if (!lead.nextContactAt) {
    return (
      <Tooltip content="Звонок не назначен — лид может потеряться. Нажмите на трубку и выберите, когда перезвонить">
        <span className="font-medium text-warning-700">Не назначен</span>
      </Tooltip>
    );
  }
  const d = new Date(lead.nextContactAt);
  const overdue = isPast(d) && !isToday(d);
  return (
    <span
      className={cn(
        "whitespace-nowrap",
        overdue ? "font-medium text-danger-600" : isToday(d) ? "font-medium text-primary-700" : "text-text-secondary"
      )}
    >
      {/* У просроченного важен только день — время уже неважно. */}
      {overdue ? `Просрочен · ${format(d, "d MMM", { locale: ru })}` : formatRelativeDay(d)}
    </span>
  );
}

/** Трубка: открывает запись итога звонка. Сам номер не набирается. */
function CallButton({ lead, full, onOpen }: { lead: LeadListItem; full?: boolean; onOpen: (l: LeadListItem) => void }) {
  const phone = lead.contact?.phone;
  const cls = cn(
    "flex items-center justify-center gap-1.5 rounded-md font-medium",
    full
      ? "h-9 bg-primary-600 px-3 text-[13px] text-white"
      : "h-8 w-8 border border-primary-200 text-primary-600 hover:bg-primary-50"
  );
  const open = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpen(lead);
  };
  return (
    <Tooltip content={phone ? `Звоните на ${phone} и записывайте здесь, чем закончился разговор` : "Записать итог звонка"}>
      <button type="button" onClick={open} className={cls} aria-label="Записать звонок">
        {phone ? <Phone className="h-4 w-4" /> : <PhoneCall className="h-4 w-4" />}
        {full && "Звонок"}
      </button>
    </Tooltip>
  );
}

export function LeadsTable({
  leads,
  currentUserRole,
  showOwner,
}: {
  leads: LeadListItem[];
  currentUserRole?: Role;
  showOwner?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [deleteTarget, setDeleteTarget] = useState<LeadListItem | null>(null);
  const [callTarget, setCallTarget] = useState<LeadListItem | null>(null);

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
      key: "call",
      header: "",
      className: "w-0 pr-0",
      render: (l) => <CallButton lead={l} onOpen={setCallTarget} />,
    },
    {
      key: "company",
      header: "Клиент",
      className: "min-w-[240px]",
      render: (l) => (
        <div className="min-w-0">
          <p className="font-medium text-text-primary">{l.company.name}</p>
          <p className="whitespace-nowrap text-[12px] text-text-tertiary">
            {[contactName(l), l.contact?.phone].filter(Boolean).join(" · ") || "Нет контакта"}
          </p>
        </div>
      ),
    },
    { key: "status", header: "Этап", render: (l) => <StatusBadge status={l.status} /> },
    {
      key: "lastCall",
      header: "Последний звонок",
      className: "max-w-[240px]",
      render: (l) =>
        l.activities[0] ? (
          <div className="min-w-0">
            <p className="truncate text-text-primary">{l.activities[0].comment || "Звонок"}</p>
            <p className="text-[12px] text-text-tertiary">{formatRelativeDay(l.activities[0].createdAt)}</p>
          </div>
        ) : (
          <span className="text-text-tertiary">Ещё не звонили</span>
        ),
    },
    { key: "nextContactAt", header: "Следующий звонок", render: (l) => <NextCall lead={l} forManager={showOwner} /> },
    ...(showOwner
      ? [
          {
            key: "owner",
            header: "Ведёт",
            render: (l: LeadListItem) => (
              <Tooltip content={`${l.owner.firstName} ${l.owner.lastName}`}>
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <Avatar firstName={l.owner.firstName} lastName={l.owner.lastName} size="xs" />
                  {/* На узком экране — только аватар, имя в подсказке. */}
                  <span className="hidden 2xl:inline">
                    {l.owner.firstName} {l.owner.lastName}
                  </span>
                </span>
              </Tooltip>
            ),
          },
        ]
      : []),
  ];

  function buildContextMenu(lead: LeadListItem): ContextMenuItem[] {
    const items: ContextMenuItem[] = [
      { label: "Записать звонок", icon: <PhoneCall />, onClick: () => setCallTarget(lead) },
      { label: "Открыть карточку", icon: <ExternalLink />, onClick: () => router.push(`/crm/leads/${lead.id}`) },
    ];
    if (currentUserRole === "DIRECTOR") {
      items.push({ label: "Удалить лид", icon: <Trash2 />, danger: true, onClick: () => setDeleteTarget(lead) });
    }
    return items;
  }

  const emptyState = (
    <EmptyState icon={<Users2 />} title="Здесь пока пусто" description="Попробуйте другую вкладку или добавьте нового клиента" />
  );

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

      <div className="divide-y divide-border-subtle md:hidden">
        {leads.length === 0 ? (
          <div className="py-12">{emptyState}</div>
        ) : (
          leads.map((lead) => (
            <div key={lead.id} onClick={() => router.push(`/crm/leads/${lead.id}`)} className="p-4 active:bg-surface-hover">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-text-primary">{lead.company.name}</p>
                  <p className="truncate text-[13px] text-text-secondary">
                    {[contactName(lead), lead.contact?.phone].filter(Boolean).join(" · ") || "Нет контакта"}
                  </p>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <Dropdown
                    trigger={
                      <button
                        className="-m-2 rounded-md p-2 text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
                        aria-label="Действия"
                      >
                        <MoreVertical className="h-4.5 w-4.5" />
                      </button>
                    }
                    items={buildContextMenu(lead)}
                  />
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="min-w-0 text-[12px]">
                  <StatusBadge status={lead.status} />
                  <p className="mt-1">
                    <NextCall lead={lead} forManager={showOwner} />
                  </p>
                </div>
                <CallButton lead={lead} full onOpen={setCallTarget} />
              </div>
            </div>
          ))
        )}
      </div>

      <QuickCallModal
        target={
          callTarget
            ? {
                leadId: callTarget.id,
                companyName: callTarget.company.name,
                contactName: contactName(callTarget),
                phone: callTarget.contact?.phone,
              }
            : null
        }
        onClose={() => setCallTarget(null)}
        onSuccess={() => {
          setCallTarget(null);
          router.refresh();
        }}
      />

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
