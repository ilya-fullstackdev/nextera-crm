"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Phone,
  Send,
  Mail,
  Globe,
  ListPlus,
  MessageSquarePlus,
  Pencil,
  ArrowRightLeft,
  XCircle,
  ChevronLeft,
  MoreHorizontal,
  CalendarClock,
  CheckSquare,
  Lightbulb,
  Handshake,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { Tabs } from "@/components/ui/tabs";
import type { ContextMenuItem } from "@/components/ui/context-menu";
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_TONE,
  LEAD_SOURCE_LABELS,
  PRIORITY_LABELS,
  PRIORITY_TONE,
  REJECTION_REASON_LABELS,
} from "@/lib/labels";
import { formatMoney, normalizeUrl } from "@/lib/finance";
import { nextStep as computeNextStep } from "@/lib/lead-steps";
import { formatShortDate, formatRelativeDay } from "@/lib/format";
import type { LeadDetail, UserRef, ContactRef } from "@/types/lead";
import type { CurrentUser } from "@/lib/auth/current-user";

import { LeadProgress } from "@/components/leads/lead-detail/lead-progress";
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
import { CloseDealModal, type PayoutCandidate } from "@/components/leads/lead-detail/close-deal-modal";
import { DealPanel, type LeadDeal } from "@/components/leads/lead-detail/deal-panel";
import { NewTaskModal } from "@/components/leads/new-task-modal";

/** Кликабельный контакт в шапке: телефон, телеграм, почта, сайт. */
function ContactChip({
  href,
  icon,
  label,
  external,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="flex min-w-0 items-center gap-2 rounded-md border border-border-subtle bg-white px-3 py-2 text-[13px] text-text-primary transition-colors hover:border-border-default hover:bg-surface-hover"
    >
      <span className="shrink-0 text-text-tertiary [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      <span className="truncate">{label}</span>
    </a>
  );
}

export function LeadDetailClient({
  lead,
  companyContacts,
  recipients,
  canEdit,
  canCloseDeal,
  currentUser,
  deal,
  finder,
  recruiter,
}: {
  lead: LeadDetail;
  companyContacts: ContactRef[];
  recipients: UserRef[];
  canEdit: boolean;
  canCloseDeal: boolean;
  currentUser: CurrentUser;
  deal: LeadDeal | null;
  finder: PayoutCandidate | null;
  recruiter: PayoutCandidate | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [closeDealOpen, setCloseDealOpen] = useState(false);

  const canHandover =
    canEdit && !["HANDED_TO_MANAGER", "NEGOTIATION", "PROPOSAL_SENT", "DEAL", "REJECTED"].includes(lead.status);
  const canReject = canEdit && lead.status !== "REJECTED" && lead.status !== "DEAL";
  const isDirector = currentUser.role === "DIRECTOR";

  function refresh() {
    router.refresh();
  }

  const pendingTasks = lead.tasks.filter((t) => t.status === "PENDING");
  const nextTask = [...pendingTasks].sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];

  // Одно первичное действие: закрыть сделку, если можно, иначе передать лид.
  const primaryAction = canCloseDeal ? "close" : canHandover ? "handover" : null;

  const step = computeNextStep(
    {
      status: lead.status,
      dmStatus: lead.dmStatus,
      needLevel: lead.needLevel,
      timeline: lead.timeline,
      budgetStatus: lead.budgetStatus,
      contactAttempts: lead.contactAttempts,
      decisionMakersCount: lead.decisionMakers.length,
      hasContactActivity: lead.activities.some((a) =>
        ["CALL", "MESSAGE", "EMAIL", "MEETING"].includes(a.type)
      ),
      hasAnyWork: lead.files.length > 0 || lead.activities.some((a) => a.type !== "STATUS_CHANGE"),
    },
    { canCloseDeal, hasDeal: Boolean(deal) }
  );

  function runStepAction(action: typeof step.action) {
    if (action === "activity") setActivityOpen(true);
    else if (action === "decisionMaker" || action === "qualification") setTab("overview");
    else if (action === "handover") setHandoverOpen(true);
    else if (action === "close") setCloseDealOpen(true);
    else if (action === "finance") setTab("finance");
  }

  const moreItems: ContextMenuItem[] = [
    ...(canEdit ? [{ label: "Редактировать лид", icon: <Pencil />, onClick: () => setEditOpen(true) }] : []),
    ...(canHandover && primaryAction !== "handover"
      ? [{ label: "Передать лид", icon: <ArrowRightLeft />, onClick: () => setHandoverOpen(true) }]
      : []),
    ...(canReject ? [{ label: "Оформить отказ", icon: <XCircle />, danger: true, onClick: () => setRejectOpen(true) }] : []),
  ];

  const tabs = [
    { value: "overview", label: "Обзор" },
    { value: "timeline", label: "История", count: lead.activities.length },
    { value: "tasks", label: "Задачи", count: pendingTasks.length },
    { value: "files", label: "Файлы", count: lead.files.length },
    ...(deal ? [{ value: "finance", label: "Финансы" }] : []),
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 md:px-6 md:py-6">
      <Link
        href="/crm/leads"
        className="inline-flex items-center gap-1 text-[13px] text-text-secondary hover:text-text-primary"
      >
        <ChevronLeft className="h-4 w-4" />
        К списку лидов
      </Link>

      {/* Шапка: кто это, на каком этапе и что делать дальше */}
      <div className="mt-3 rounded-lg border border-border-subtle bg-white shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4 p-4 sm:p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-text-primary">{lead.company.name}</h1>
              <Badge tone={LEAD_STATUS_TONE[lead.status]}>{LEAD_STATUS_LABELS[lead.status]}</Badge>
              <Badge tone={PRIORITY_TONE[lead.priority]}>{PRIORITY_LABELS[lead.priority]}</Badge>
              {deal && <Badge tone="success">{formatMoney(deal.amount)}</Badge>}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-text-secondary">
              <span className="flex items-center gap-1.5">
                <Avatar firstName={lead.owner.firstName} lastName={lead.owner.lastName} size="xs" />
                <span className="text-text-primary">
                  {lead.owner.firstName} {lead.owner.lastName}
                </span>
              </span>
              {lead.contact && (
                <span>
                  {lead.contact.firstName} {lead.contact.lastName ?? ""}
                  {lead.contact.position ? `, ${lead.contact.position}` : ""}
                </span>
              )}
              <span>Источник: {LEAD_SOURCE_LABELS[lead.source]}</span>
              <span>
                Завёл {lead.createdBy.firstName} {lead.createdBy.lastName} · {formatShortDate(lead.createdAt)}
              </span>
            </div>
          </div>

          <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
            {primaryAction === "close" && (
              <Button
                variant="primary"
                className="flex-1 justify-center sm:flex-none"
                icon={<Handshake />}
                onClick={() => setCloseDealOpen(true)}
              >
                Закрыть сделку
              </Button>
            )}
            {primaryAction === "handover" && (
              <Button
                variant="primary"
                className="flex-1 justify-center sm:flex-none"
                icon={<ArrowRightLeft />}
                onClick={() => setHandoverOpen(true)}
              >
                Передать
              </Button>
            )}
            {moreItems.length > 0 && (
              <Dropdown
                trigger={
                  <Button variant="secondary" size="icon" aria-label="Другие действия">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                }
                items={moreItems}
              />
            )}
          </div>
        </div>

        {/* Связаться в один клик */}
        {(lead.contact?.phone || lead.contact?.telegram || lead.contact?.email || lead.company.website) && (
          <div className="grid grid-cols-1 gap-2 border-t border-border-subtle px-4 py-3 sm:grid-cols-2 sm:px-5 md:flex md:flex-wrap">
            {lead.contact?.phone && (
              <ContactChip href={`tel:${lead.contact.phone}`} icon={<Phone />} label={lead.contact.phone} />
            )}
            {lead.contact?.telegram && (
              <ContactChip
                href={`https://t.me/${lead.contact.telegram.replace("@", "")}`}
                icon={<Send />}
                label={lead.contact.telegram}
                external
              />
            )}
            {lead.contact?.email && (
              <ContactChip href={`mailto:${lead.contact.email}`} icon={<Mail />} label={lead.contact.email} />
            )}
            {lead.company.website && (
              <ContactChip
                href={normalizeUrl(lead.company.website)}
                icon={<Globe />}
                label={lead.company.website}
                external
              />
            )}
          </div>
        )}

        <div className="border-t border-border-subtle px-4 py-4 sm:px-5">
          <LeadProgress status={lead.status} />
        </div>
      </div>

      {/* Что делать дальше — подсказка меняется по мере заполнения карточки */}
      <div className="mt-3 rounded-lg border border-border-subtle bg-white p-4 shadow-xs">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-600">
            <Lightbulb className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] text-text-secondary">Следующий шаг</p>
            <p className="text-[15px] font-semibold text-text-primary">{step.title}</p>
            <p className="mt-0.5 text-[13px] text-text-secondary">{step.description}</p>
          </div>
        </div>

        {/* Ближайшая задача и все кнопки — одним рядом */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border-subtle pt-3">
          <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-text-secondary">
            <CalendarClock className="h-4 w-4 shrink-0 text-text-tertiary" />
            {nextTask ? (
              <span className="truncate">
                {nextTask.title}
                <span className="ml-1.5 text-text-tertiary">{formatRelativeDay(nextTask.dueAt)}</span>
              </span>
            ) : lead.nextContactAt ? (
              <span>Связаться {formatShortDate(lead.nextContactAt)}</span>
            ) : (
              <span className="text-text-tertiary">Задач и звонков не запланировано</span>
            )}
          </span>

          <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
            {step.action !== "none" && (
              <Button variant="primary" size="sm" onClick={() => runStepAction(step.action)}>
                {step.actionLabel}
              </Button>
            )}
            <Button variant="secondary" size="sm" icon={<ListPlus />} onClick={() => setTaskOpen(true)}>
              Задача
            </Button>
            <Button variant="secondary" size="sm" icon={<MessageSquarePlus />} onClick={() => setActivityOpen(true)}>
              Активность
            </Button>
          </div>
        </div>
      </div>

      {/* Отказ виден сразу, без поиска в истории */}
      {lead.status === "REJECTED" && lead.rejectionReason && (
        <div className="mt-3 rounded-lg border border-danger-100 bg-danger-50 p-4">
          <p className="text-[13px] font-semibold text-danger-700">
            Отказ: {REJECTION_REASON_LABELS[lead.rejectionReason]}
          </p>
          {lead.rejectionComment && <p className="mt-1 text-[13px] text-danger-700">{lead.rejectionComment}</p>}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="order-1 lg:col-span-2">
          <Tabs value={tab} onChange={setTab} items={tabs} />
          <div className="mt-4 space-y-4">
            {tab === "overview" && (
              <>
                <QualificationCard lead={lead} canEdit={canEdit} onChange={refresh} />
                <DecisionMakersCard
                  leadId={lead.id}
                  decisionMakers={lead.decisionMakers}
                  companyContacts={companyContacts}
                  canEdit={canEdit}
                  onChange={refresh}
                />
              </>
            )}
            {tab === "timeline" && <ActivityTimelinePanel activities={lead.activities} handovers={lead.handovers} />}
            {tab === "tasks" && <TasksPanel leadId={lead.id} tasks={lead.tasks} onChange={refresh} />}
            {tab === "files" && <FilesPanel leadId={lead.id} files={lead.files} onChange={refresh} />}
            {tab === "finance" && deal && <DealPanel deal={deal} canManage={isDirector} />}
          </div>
        </div>

        <div className="order-2 space-y-4">
          <CompanyContactCard lead={lead} />

          {/* Короткая сводка задач, чтобы не переключать вкладку */}
          <div className="rounded-lg border border-border-subtle bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-text-primary">
              <CheckSquare className="h-4 w-4 text-text-tertiary" />
              Задачи в работе
            </div>
            {pendingTasks.length === 0 ? (
              <p className="mt-2 text-[13px] text-text-tertiary">Открытых задач нет</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {pendingTasks.slice(0, 4).map((t) => (
                  <li key={t.id} className="flex items-baseline justify-between gap-2 text-[13px]">
                    <span className="truncate text-text-primary">{t.title}</span>
                    <span className="shrink-0 text-xs text-text-tertiary">{formatShortDate(t.dueAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <EditLeadModal open={editOpen} lead={lead} onClose={() => setEditOpen(false)} onSuccess={() => { setEditOpen(false); refresh(); }} />
      <HandoverModal open={handoverOpen} lead={lead} recipients={recipients} onClose={() => setHandoverOpen(false)} onSuccess={() => { setHandoverOpen(false); refresh(); }} />
      <RejectModal open={rejectOpen} leadId={lead.id} onClose={() => setRejectOpen(false)} onSuccess={() => { setRejectOpen(false); refresh(); }} />
      <AddActivityModal open={activityOpen} leadId={lead.id} onClose={() => setActivityOpen(false)} onSuccess={() => { setActivityOpen(false); refresh(); }} />
      <CloseDealModal
        open={closeDealOpen}
        leadId={lead.id}
        companyName={lead.company.name}
        finder={finder}
        recruiter={recruiter}
        onClose={() => setCloseDealOpen(false)}
        onSuccess={() => {
          setCloseDealOpen(false);
          setTab("finance");
          refresh();
        }}
      />
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
