"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { KanbanCard } from "@/components/ui/kanban-card";
import { useToast } from "@/components/ui/toast";
import { LEAD_STATUS_ORDER, LEAD_STATUS_LABELS } from "@/lib/labels";
import { formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LeadStatus, Priority } from "@/generated/prisma/enums";

interface PipelineLead {
  id: string;
  status: LeadStatus;
  priority: Priority;
  nextContactAt: string | null;
  company: { name: string };
  contact: { firstName: string; lastName: string | null } | null;
  owner: { firstName: string; lastName: string };
}

const GUARDED_STATUSES: LeadStatus[] = ["REJECTED", "HANDED_TO_MANAGER"];

export function PipelineBoard({ leads: initialLeads }: { leads: PipelineLead[]; managers: unknown[] }) {
  const router = useRouter();
  const toast = useToast();
  const [leads, setLeads] = useState(initialLeads);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<LeadStatus | null>(null);

  const columns = useMemo(() => {
    const map = new Map<LeadStatus, PipelineLead[]>();
    LEAD_STATUS_ORDER.forEach((s) => map.set(s, []));
    for (const lead of leads) {
      map.get(lead.status)?.push(lead);
    }
    return map;
  }, [leads]);

  async function handleDrop(status: LeadStatus) {
    setDragOverStatus(null);
    if (!draggingId) return;
    const lead = leads.find((l) => l.id === draggingId);
    setDraggingId(null);
    if (!lead || lead.status === status) return;

    if (GUARDED_STATUSES.includes(status)) {
      toast.info(
        status === "REJECTED" ? "Укажите причину отказа в карточке лида" : "Передача менеджеру выполняется из карточки лида"
      );
      return;
    }

    const prevStatus = lead.status;
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status } : l)));

    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status: prevStatus } : l)));
      toast.error("Не удалось изменить статус");
      return;
    }
    toast.success("Статус обновлён", `${lead.company.name} → ${LEAD_STATUS_LABELS[status]}`);
    router.refresh();
  }

  return (
    <div className="flex h-full snap-x snap-mandatory gap-3 overflow-x-auto px-[7.5vw] py-3 sm:px-4 md:snap-none md:p-6">
      {LEAD_STATUS_ORDER.map((status) => {
        const items = columns.get(status) ?? [];
        return (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverStatus(status);
            }}
            onDragLeave={() => setDragOverStatus((s) => (s === status ? null : s))}
            onDrop={() => handleDrop(status)}
            className={cn(
              "flex h-full w-[85vw] shrink-0 snap-center flex-col rounded-lg border bg-neutral-50 transition-colors sm:w-80 md:w-72 md:snap-align-none",
              dragOverStatus === status ? "border-primary-400 bg-primary-50/40" : "border-border-subtle"
            )}
          >
            <div className="flex items-center justify-between px-3 py-2.5">
              <p className="text-[13px] font-semibold text-text-primary">{LEAD_STATUS_LABELS[status]}</p>
              <span className="rounded-full bg-neutral-200 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600">
                {items.length}
              </span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto px-2.5 pb-3">
              {items.map((lead) => (
                <KanbanCard
                  key={lead.id}
                  companyName={lead.company.name}
                  contactName={lead.contact ? `${lead.contact.firstName} ${lead.contact.lastName ?? ""}` : null}
                  priority={lead.priority}
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
  );
}
