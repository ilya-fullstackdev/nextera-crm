"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";
import { KanbanCard } from "@/components/ui/kanban-card";
import { Hint } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/toast";
import { LEAD_STATUS_LABELS } from "@/lib/labels";
import { formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/generated/prisma/enums";

interface PipelineLead {
  id: string;
  status: LeadStatus;
  nextContactAt: string | null;
  company: { name: string };
  contact: { firstName: string; lastName: string | null } | null;
  owner: { firstName: string; lastName: string };
}

/**
 * Пять понятных этапов вместо одиннадцати статусов. Внутри этапа точный
 * статус виден на карточке. `dropTo` — какой статус ставится при переносе;
 * null — перенос сюда делается только через карточку лида.
 */
const COLUMNS: {
  key: string;
  title: string;
  hint: string;
  statuses: LeadStatus[];
  dropTo: LeadStatus | null;
  dropHint?: string;
}[] = [
  {
    key: "calling",
    title: "Обзваниваем",
    hint: "Новые лиды и те, с кем уже был первый разговор, но до того, кто решает, пока не дошли",
    statuses: ["NEW", "SEARCHING_DM", "FIRST_CONTACT", "CALLBACK_LATER"],
    dropTo: "FIRST_CONTACT",
  },
  {
    key: "dm",
    title: "Вышли на ЛПР",
    hint: "Поговорили с тем, кто принимает решение. Дальше — выяснить потребность, бюджет или сроки",
    statuses: ["DM_FOUND"],
    dropTo: "DM_FOUND",
  },
  {
    key: "qualified",
    title: "Готов к передаче",
    hint: "Всё нужное известно — лид можно передавать руководителю",
    statuses: ["QUALIFICATION"],
    dropTo: "QUALIFICATION",
  },
  {
    key: "manager",
    title: "У руководителя",
    hint: "Переговоры и коммерческое предложение",
    statuses: ["HANDED_TO_MANAGER", "NEGOTIATION", "PROPOSAL_SENT"],
    dropTo: null,
    dropHint: "Нажмите «Передать» в карточке лида — брифинг для руководителя соберётся сам",
  },
  {
    key: "deal",
    title: "Сделка",
    hint: "Клиент заплатил",
    statuses: ["DEAL"],
    dropTo: null,
    dropHint: "Закройте сделку в карточке лида — там указывается сумма",
  },
];

export function PipelineBoard({ leads: serverLeads, rejectedCount }: { leads: PipelineLead[]; rejectedCount: number }) {
  const router = useRouter();
  const toast = useToast();
  // Список всегда берём из серверных данных: так удалённый лид исчезает с доски
  // сразу после router.refresh(). В state держим только статусы, которые
  // перетащили прямо сейчас, — чтобы карточка не прыгала до ответа сервера.
  const [pendingStatus, setPendingStatus] = useState<Record<string, LeadStatus>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const leads = useMemo(
    () => serverLeads.map((l) => (pendingStatus[l.id] ? { ...l, status: pendingStatus[l.id] } : l)),
    [serverLeads, pendingStatus]
  );

  async function handleDrop(column: (typeof COLUMNS)[number]) {
    setDragOver(null);
    if (!draggingId) return;
    const lead = leads.find((l) => l.id === draggingId);
    setDraggingId(null);
    if (!lead || column.statuses.includes(lead.status)) return;

    if (!column.dropTo) {
      toast.info(column.dropHint ?? "Сделайте это в карточке лида");
      return;
    }
    const status = column.dropTo;
    setPendingStatus((prev) => ({ ...prev, [lead.id]: status }));

    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      setPendingStatus((prev) => {
        const next = { ...prev };
        delete next[lead.id];
        return next;
      });
      toast.error("Не удалось перенести лид");
      return;
    }
    toast.success("Лид перенесён", `${lead.company.name} → ${column.title}`);
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto px-[7.5vw] py-3 sm:px-4 md:snap-none md:p-6 md:pb-3">
        {COLUMNS.map((column) => {
          const items = leads.filter((l) => column.statuses.includes(l.status));
          return (
            <div
              key={column.key}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(column.key);
              }}
              onDragLeave={() => setDragOver((k) => (k === column.key ? null : k))}
              onDrop={() => handleDrop(column)}
              className={cn(
                "flex h-full w-[85vw] shrink-0 snap-center flex-col rounded-lg border bg-neutral-50 transition-colors sm:w-80 md:w-auto md:min-w-44 md:flex-1 md:snap-align-none",
                dragOver === column.key ? "border-primary-400 bg-primary-50/40" : "border-border-subtle"
              )}
            >
              <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-[13px] font-semibold text-text-primary">
                  {column.title}
                  <Hint side="bottom">{column.hint}</Hint>
                </p>
                <span className="rounded-full bg-neutral-200 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600">
                  {items.length}
                </span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto px-2.5 pb-3">
                {items.map((lead) => (
                  <KanbanCard
                    key={lead.id}
                    companyName={lead.company.name}
                    contactName={lead.contact ? `${lead.contact.firstName} ${lead.contact.lastName ?? ""}`.trim() : null}
                    // Точный статус показываем, только если в колонке их несколько.
                    stage={column.statuses.length > 1 ? LEAD_STATUS_LABELS[lead.status] : null}
                    owner={lead.owner}
                    nextContactAt={lead.nextContactAt ? formatShortDate(lead.nextContactAt) : null}
                    draggable
                    dragging={draggingId === lead.id}
                    onDragStart={() => setDraggingId(lead.id)}
                    onDragEnd={() => setDraggingId(null)}
                    onClick={() => router.push(`/crm/leads/${lead.id}`)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {rejectedCount > 0 && (
        <div className="px-4 pb-4 md:px-6">
          <Link
            href="/crm/leads?view=rejected"
            className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-danger-600"
          >
            <XCircle className="h-4 w-4" />
            Отказы: {rejectedCount} — открыть список
          </Link>
        </div>
      )}
    </div>
  );
}
