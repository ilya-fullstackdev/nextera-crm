"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Send, ListPlus, MessageSquarePlus, Pencil, ArrowRightLeft, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { LEAD_STATUS_LABELS, LEAD_STATUS_TONE, PRIORITY_LABELS, PRIORITY_TONE } from "@/lib/labels";
import type { LeadDetail, UserRef, ContactRef } from "@/types/lead";
import type { CurrentUser } from "@/lib/auth/current-user";

import { CompanyContactCard } from "@/components/leads/lead-detail/company-contact-card";
import { QualificationCard } from "@/components/leads/lead-detail/qualification-card";
import { DecisionMakersCard } from "@/components/leads/lead-detail/decision-makers-card";
import { ActivityTimelinePanel } from "@/components/leads/lead-detail/activity-timeline-panel";
import { TasksPanel } from "@/components/leads/lead-detail/tasks-panel";
import { FilesPanel } from "@/components/leads/lead-detail/files-panel";
import { EditLeadModal } from "@/components/leads/lead-detail/edit-lead-modal";
import { HandoverModal } from "@/components/leads/lead-detail/handover-modal";
import { RejectModal } from "@/components/leads/lead-detail/reject-modal";
import { AddActivityModal } from "@/components/leads/lead-detail/add-activity-modal";
import { NewTaskModal } from "@/components/leads/new-task-modal";

export function LeadDetailClient({
  lead,
  companyContacts,
  managers,
  canEdit,
  currentUser,
}: {
  lead: LeadDetail;
  companyContacts: ContactRef[];
  managers: UserRef[];
  canEdit: boolean;
  currentUser: CurrentUser;
}) {
  const router = useRouter();
  const [tab, setTab] = useState("timeline");
  const [editOpen, setEditOpen] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);

  const canHandover = canEdit && !["HANDED_TO_MANAGER", "NEGOTIATION", "PROPOSAL_SENT", "DEAL", "REJECTED"].includes(lead.status);
  const canReject = canEdit && lead.status !== "REJECTED" && lead.status !== "DEAL";

  function refresh() {
    router.refresh();
  }

  const pendingTasks = lead.tasks.filter((t) => t.status === "PENDING").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 md:px-6 md:py-6">
      <div className="rounded-lg border border-border-subtle bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-semibold text-text-primary">{lead.company.name}</h1>
              <Badge tone={LEAD_STATUS_TONE[lead.status]}>{LEAD_STATUS_LABELS[lead.status]}</Badge>
              <Badge tone={PRIORITY_TONE[lead.priority]}>{PRIORITY_LABELS[lead.priority]}</Badge>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[13px] text-text-secondary">
              <span>Ответственный:</span>
              <Avatar firstName={lead.owner.firstName} lastName={lead.owner.lastName} size="xs" />
              <span className="font-medium text-text-primary">
                {lead.owner.firstName} {lead.owner.lastName}
              </span>
            </div>
          </div>

          <div className="hidden flex-wrap items-center gap-2 md:flex">
            {lead.contact?.phone && (
              <a href={`tel:${lead.contact.phone}`}>
                <Button variant="secondary" icon={<Phone />}>
                  Позвонить
                </Button>
              </a>
            )}
            {lead.contact?.telegram && (
              <a href={`https://t.me/${lead.contact.telegram.replace("@", "")}`} target="_blank">
                <Button variant="secondary" icon={<Send />}>
                  Telegram
                </Button>
              </a>
            )}
            <Button variant="secondary" icon={<ListPlus />} onClick={() => setTaskOpen(true)}>
              Добавить задачу
            </Button>
            <Button variant="secondary" icon={<MessageSquarePlus />} onClick={() => setActivityOpen(true)}>
              Добавить активность
            </Button>
            {canEdit && (
              <Button variant="secondary" icon={<Pencil />} onClick={() => setEditOpen(true)}>
                Редактировать
              </Button>
            )}
            {canHandover && (
              <Button variant="primary" icon={<ArrowRightLeft />} onClick={() => setHandoverOpen(true)}>
                Передать менеджеру
              </Button>
            )}
            {canReject && (
              <Button variant="danger" icon={<XCircle />} onClick={() => setRejectOpen(true)}>
                Отказ
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 border-t border-border-subtle pt-4 md:hidden">
          {lead.contact?.phone && (
            <a
              href={`tel:${lead.contact.phone}`}
              className="flex flex-col items-center gap-1 rounded-md py-1.5 text-primary-600 active:bg-surface-hover"
            >
              <Phone className="h-5 w-5" />
              <span className="text-[11px] font-medium">Звонок</span>
            </a>
          )}
          {lead.contact?.telegram && (
            <a
              href={`https://t.me/${lead.contact.telegram.replace("@", "")}`}
              target="_blank"
              className="flex flex-col items-center gap-1 rounded-md py-1.5 text-primary-600 active:bg-surface-hover"
            >
              <Send className="h-5 w-5" />
              <span className="text-[11px] font-medium">Telegram</span>
            </a>
          )}
          <button
            onClick={() => setTaskOpen(true)}
            className="flex flex-col items-center gap-1 rounded-md py-1.5 text-text-secondary active:bg-surface-hover"
          >
            <ListPlus className="h-5 w-5" />
            <span className="text-[11px] font-medium">Задача</span>
          </button>
          <button
            onClick={() => setActivityOpen(true)}
            className="flex flex-col items-center gap-1 rounded-md py-1.5 text-text-secondary active:bg-surface-hover"
          >
            <MessageSquarePlus className="h-5 w-5" />
            <span className="text-[11px] font-medium">Активность</span>
          </button>
          {canEdit && (
            <button
              onClick={() => setEditOpen(true)}
              className="flex flex-col items-center gap-1 rounded-md py-1.5 text-text-secondary active:bg-surface-hover"
            >
              <Pencil className="h-5 w-5" />
              <span className="text-[11px] font-medium">Изменить</span>
            </button>
          )}
        </div>
        {(canHandover || canReject) && (
          <div className="mt-3 flex gap-2 md:hidden">
            {canHandover && (
              <Button variant="primary" className="flex-1 justify-center" icon={<ArrowRightLeft />} onClick={() => setHandoverOpen(true)}>
                Передать
              </Button>
            )}
            {canReject && (
              <Button variant="danger" className="flex-1 justify-center" icon={<XCircle />} onClick={() => setRejectOpen(true)}>
                Отказ
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: "timeline", label: "История", count: lead.activities.length },
              { value: "tasks", label: "Задачи", count: pendingTasks },
              { value: "files", label: "Файлы", count: lead.files.length },
            ]}
          />
          <div className="mt-4">
            {tab === "timeline" && <ActivityTimelinePanel activities={lead.activities} handovers={lead.handovers} />}
            {tab === "tasks" && <TasksPanel leadId={lead.id} tasks={lead.tasks} onChange={refresh} />}
            {tab === "files" && <FilesPanel leadId={lead.id} files={lead.files} onChange={refresh} />}
          </div>
        </div>

        <div className="space-y-4">
          <CompanyContactCard lead={lead} />
          <QualificationCard lead={lead} canEdit={canEdit} onChange={refresh} />
          <DecisionMakersCard
            leadId={lead.id}
            decisionMakers={lead.decisionMakers}
            companyContacts={companyContacts}
            canEdit={canEdit}
            onChange={refresh}
          />
        </div>
      </div>

      <EditLeadModal open={editOpen} lead={lead} onClose={() => setEditOpen(false)} onSuccess={() => { setEditOpen(false); refresh(); }} />
      <HandoverModal open={handoverOpen} lead={lead} managers={managers} onClose={() => setHandoverOpen(false)} onSuccess={() => { setHandoverOpen(false); refresh(); }} />
      <RejectModal open={rejectOpen} leadId={lead.id} onClose={() => setRejectOpen(false)} onSuccess={() => { setRejectOpen(false); refresh(); }} />
      <AddActivityModal open={activityOpen} leadId={lead.id} onClose={() => setActivityOpen(false)} onSuccess={() => { setActivityOpen(false); refresh(); }} />
      <NewTaskModal
        open={taskOpen}
        leadId={lead.id}
        defaultAssigneeId={currentUser.id}
        onClose={() => setTaskOpen(false)}
        onSuccess={() => { setTaskOpen(false); refresh(); }}
      />
    </div>
  );
}
