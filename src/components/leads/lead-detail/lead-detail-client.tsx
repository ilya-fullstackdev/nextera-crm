"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Phone,
  PhoneCall,
  Send,
  Mail,
  Globe,
  Pencil,
  ArrowRightLeft,
  XCircle,
  ChevronLeft,
  MoreHorizontal,
  Lightbulb,
  Handshake,
  BellPlus,
  StickyNote,
  Circle,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { Tooltip } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import type { ContextMenuItem } from "@/components/ui/context-menu";
import { REJECTION_REASON_LABELS } from "@/lib/labels";
import { formatMoney, normalizeUrl } from "@/lib/finance";
import { nextStep as computeNextStep } from "@/lib/lead-steps";
import { formatRelativeDay } from "@/lib/format";
import type { LeadDetail, UserRef } from "@/types/lead";
import type { CurrentUser } from "@/lib/auth/current-user";

import { StatusBadge } from "@/components/leads/status-badge";
import { LeadProgress } from "@/components/leads/lead-detail/lead-progress";
import { CompanyContactCard } from "@/components/leads/lead-detail/company-contact-card";
import { QualificationCard } from "@/components/leads/lead-detail/qualification-card";
import { ActivityTimelinePanel } from "@/components/leads/lead-detail/activity-timeline-panel";
import { FilesPanel } from "@/components/leads/lead-detail/files-panel";
import { EditLeadModal } from "@/components/leads/lead-detail/edit-lead-modal";
import { HandoverModal } from "@/components/leads/lead-detail/handover-modal";
import { RejectModal } from "@/components/leads/lead-detail/reject-modal";
import { CloseDealModal, type PayoutCandidate } from "@/components/leads/lead-detail/close-deal-modal";
import { DealPanel, type LeadDeal } from "@/components/leads/lead-detail/deal-panel";
import { NextCallPicker } from "@/components/leads/lead-detail/next-call-picker";
import { NewTaskModal } from "@/components/leads/new-task-modal";
import { QuickCallModal } from "@/components/leads/quick-call-modal";

/** Кликабельный контакт в шапке: телефон, телеграм, почта, сайт. */
function ContactChip({
  href,
  icon,
  label,
  hint,
  external,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  hint: string;
  external?: boolean;
}) {
  return (
    <Tooltip content={hint}>
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="flex min-w-0 items-center gap-2 rounded-md border border-border-subtle bg-white px-3 py-2 text-[13px] text-text-primary transition-colors hover:border-border-default hover:bg-surface-hover"
      >
        <span className="shrink-0 text-text-tertiary [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        <span className="truncate">{label}</span>
      </a>
    </Tooltip>
  );
}

/** Быстрая заметка прямо над историей — без отдельного окна. */
function QuickNote({ leadId, onSaved }: { leadId: string; onSaved: () => void }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "NOTE", comment: text.trim() }),
      });
      if (!res.ok) {
        toast.error("Не удалось сохранить заметку");
        return;
      }
      setText("");
      toast.success("Заметка добавлена");
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-end gap-2">
      <Textarea
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
        }}
        placeholder="Заметка: письмо отправлено, встреча назначена…"
      />
      <Button variant="secondary" icon={<StickyNote />} loading={saving} disabled={!text.trim()} onClick={save}>
        Добавить
      </Button>
    </div>
  );
}

export function LeadDetailClient({
  lead,
  recipients,
  canEdit,
  canCloseDeal,
  currentUser,
  deal,
  finder,
  recruiter,
}: {
  lead: LeadDetail;
  recipients: UserRef[];
  canEdit: boolean;
  canCloseDeal: boolean;
  currentUser: CurrentUser;
  deal: LeadDeal | null;
  finder: PayoutCandidate | null;
  recruiter: PayoutCandidate | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [closeDealOpen, setCloseDealOpen] = useState(false);

  const closed = lead.status === "REJECTED" || lead.status === "DEAL";
  const canHandover =
    canEdit &&
    recipients.length > 0 &&
    !["HANDED_TO_MANAGER", "NEGOTIATION", "PROPOSAL_SENT", "DEAL", "REJECTED"].includes(lead.status);
  const canReject = canEdit && !closed;
  const isDirector = currentUser.role === "DIRECTOR";

  function refresh() {
    router.refresh();
  }

  // Звонки живут в очереди; здесь — только напоминания, поставленные руками.
  const reminders = lead.tasks.filter((t) => t.status === "PENDING" && t.type !== "CALL" && t.type !== "FOLLOW_UP");

  const step = computeNextStep(
    {
      status: lead.status,
      dmStatus: lead.dmStatus,
      needLevel: lead.needLevel,
      timeline: lead.timeline,
      budgetStatus: lead.budgetStatus,
      contactAttempts: lead.contactAttempts,
      decisionMakersCount: lead.decisionMakers.length,
      hasContactActivity: lead.activities.some((a) => ["CALL", "MESSAGE", "EMAIL", "MEETING"].includes(a.type)),
      hasAnyWork: lead.files.length > 0 || lead.activities.some((a) => a.type !== "STATUS_CHANGE"),
    },
    { canCloseDeal, hasDeal: Boolean(deal) }
  );

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function runStepAction() {
    if (step.action === "activity") setCallOpen(true);
    else if (step.action === "handover") setHandoverOpen(true);
    else if (step.action === "close") setCloseDealOpen(true);
    else if (step.action === "decisionMaker" || step.action === "qualification") scrollTo("qualification");
    else if (step.action === "finance") scrollTo("finance");
  }

  async function completeReminder(id: string) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DONE" }),
    });
    if (res.ok) {
      toast.success("Готово");
      refresh();
    }
  }

  const moreItems: ContextMenuItem[] = [
    ...(canEdit ? [{ label: "Изменить название и контакты", icon: <Pencil />, onClick: () => setEditOpen(true) }] : []),
    { label: "Напоминание (встреча, письмо…)", icon: <BellPlus />, onClick: () => setTaskOpen(true) },
    ...(canHandover && canCloseDeal
      ? [{ label: "Передать другому руководителю", icon: <ArrowRightLeft />, onClick: () => setHandoverOpen(true) }]
      : []),
  ];

  const contactName = lead.contact ? `${lead.contact.firstName} ${lead.contact.lastName ?? ""}`.trim() : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 pb-24 md:px-6 md:py-6">
      <Link href="/crm/leads" className="inline-flex items-center gap-1 text-[13px] text-text-secondary hover:text-text-primary">
        <ChevronLeft className="h-4 w-4" />
        К списку лидов
      </Link>

      {/* Шапка: кто это, как связаться и главное действие */}
      <div className="mt-3 rounded-lg border border-border-subtle bg-white shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4 p-4 sm:p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-text-primary">{lead.company.name}</h1>
              <StatusBadge status={lead.status} />
              {deal && (
                <span className="rounded-full bg-success-50 px-2 py-0.5 text-[12px] font-semibold text-success-700">
                  {formatMoney(deal.amount)}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-text-secondary">
              {contactName && (
                <span className="text-text-primary">
                  {contactName}
                  {lead.contact?.position ? `, ${lead.contact.position}` : ""}
                </span>
              )}
              {isDirector && (
                <span className="flex items-center gap-1.5">
                  <Avatar firstName={lead.owner.firstName} lastName={lead.owner.lastName} size="xs" />
                  {lead.owner.firstName} {lead.owner.lastName}
                </span>
              )}
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">
            {!closed && (
              <Tooltip content="Записать, чем закончился звонок, и назначить следующий" className="flex-1 sm:flex-none">
                <Button variant="primary" icon={<PhoneCall />} className="w-full justify-center" onClick={() => setCallOpen(true)}>
                  Записать звонок
                </Button>
              </Tooltip>
            )}
            {canCloseDeal && (
              <Tooltip content="Клиент заплатил — укажите сумму, выплаты посчитаются сами" className="flex-1 sm:flex-none">
                <Button variant="secondary" icon={<Handshake />} className="w-full justify-center" onClick={() => setCloseDealOpen(true)}>
                  Закрыть сделку
                </Button>
              </Tooltip>
            )}
            {canHandover && !canCloseDeal && (
              <Tooltip
                content="Отдать лид руководителю, когда клиент заинтересован. Брифинг соберётся сам"
                className="flex-1 sm:flex-none"
              >
                <Button variant="secondary" icon={<ArrowRightLeft />} className="w-full justify-center" onClick={() => setHandoverOpen(true)}>
                  Передать
                </Button>
              </Tooltip>
            )}
            {canReject && (
              <Tooltip content="Клиент не хочет работать — укажите причину, лид уйдёт в «Отказы»" className="flex-1 sm:flex-none">
                <Button
                  variant="dangerOutline"
                  icon={<XCircle />}
                  className="w-full justify-center"
                  onClick={() => setRejectOpen(true)}
                >
                  Отказ
                </Button>
              </Tooltip>
            )}
            <Dropdown
              trigger={
                <Button variant="secondary" size="icon" aria-label="Другие действия" title="Другие действия">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              }
              items={moreItems}
            />
          </div>
        </div>

        {/* Связаться в один клик */}
        {(lead.contact?.phone || lead.contact?.telegram || lead.contact?.email || lead.company.website) && (
          <div className="grid grid-cols-1 gap-2 border-t border-border-subtle px-4 py-3 sm:grid-cols-2 sm:px-5 md:flex md:flex-wrap">
            {lead.contact?.phone && (
              <span className="flex min-w-0 select-all items-center gap-2 rounded-md border border-border-subtle bg-white px-3 py-2 text-[13px] text-text-primary">
                <Phone className="h-4 w-4 shrink-0 text-text-tertiary" />
                <span className="truncate">{lead.contact.phone}</span>
              </span>
            )}
            {lead.contact?.telegram && (
              <ContactChip
                href={`https://t.me/${lead.contact.telegram.replace("@", "")}`}
                icon={<Send />}
                label={lead.contact.telegram}
                hint="Написать в Telegram"
                external
              />
            )}
            {lead.contact?.email && (
              <ContactChip href={`mailto:${lead.contact.email}`} icon={<Mail />} label={lead.contact.email} hint="Написать письмо" />
            )}
            {lead.company.website && (
              <ContactChip
                href={normalizeUrl(lead.company.website)}
                icon={<Globe />}
                label={lead.company.website}
                hint="Открыть сайт клиента"
                external
              />
            )}
          </div>
        )}

        {!closed && (
          <div className="border-t border-border-subtle px-4 py-3 sm:px-5">
            <NextCallPicker leadId={lead.id} nextContactAt={lead.nextContactAt} canEdit={canEdit} onChange={refresh} />
          </div>
        )}

        <div className="border-t border-border-subtle px-4 py-4 sm:px-5">
          <LeadProgress status={lead.status} />
        </div>
      </div>

      {/* Что делать дальше — подсказка меняется по мере заполнения карточки */}
      <div className="mt-3 flex flex-col gap-3 rounded-lg border border-primary-100 bg-primary-50/50 p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-primary-600">
            <Lightbulb className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] text-text-secondary">Что сделать дальше</p>
            <p className="text-[15px] font-semibold text-text-primary">{step.title}</p>
            <p className="mt-0.5 text-[13px] text-text-secondary">{step.description}</p>
          </div>
        </div>
        {step.action !== "none" && (
          <Button variant="primary" size="sm" className="justify-center" onClick={runStepAction}>
            {step.actionLabel}
          </Button>
        )}
      </div>

      {/* Отказ виден сразу, без поиска в истории */}
      {lead.status === "REJECTED" && lead.rejectionReason && (
        <div className="mt-3 rounded-lg border border-danger-100 bg-danger-50 p-4">
          <p className="text-[13px] font-semibold text-danger-700">Отказ: {REJECTION_REASON_LABELS[lead.rejectionReason]}</p>
          {lead.rejectionComment && <p className="mt-1 text-[13px] text-danger-700">{lead.rejectionComment}</p>}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {deal && (
            <div id="finance" className="scroll-mt-4">
              <DealPanel deal={deal} canManage={isDirector} />
            </div>
          )}

          <div id="qualification" className="scroll-mt-4">
            <QualificationCard lead={lead} canEdit={canEdit} onChange={refresh} />
          </div>

          <div className="rounded-lg border border-border-subtle bg-white shadow-xs">
            <div className="border-b border-border-subtle px-5 py-4">
              <h3 className="text-sm font-semibold text-text-primary">История</h3>
              <p className="mt-0.5 text-[13px] text-text-secondary">Все звонки, заметки и изменения по клиенту</p>
            </div>
            <div className="space-y-5 px-5 py-4">
              <QuickNote leadId={lead.id} onSaved={refresh} />
              <ActivityTimelinePanel activities={lead.activities} handovers={lead.handovers} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {reminders.length > 0 && (
            <div className="rounded-lg border border-border-subtle bg-white p-4 shadow-xs">
              <p className="text-[13px] font-semibold text-text-primary">Напоминания</p>
              <ul className="mt-2 space-y-2">
                {reminders.map((t) => (
                  <li key={t.id} className="flex items-start gap-2 text-[13px]">
                    <Tooltip content="Отметить выполненным">
                      <button
                        onClick={() => completeReminder(t.id)}
                        aria-label="Отметить выполненным"
                        className="mt-0.5 text-text-tertiary hover:text-success-600"
                      >
                        <Circle className="h-4 w-4" />
                      </button>
                    </Tooltip>
                    <span className="min-w-0">
                      <span className="block text-text-primary">{t.title}</span>
                      <span className="text-xs text-text-tertiary">{formatRelativeDay(t.dueAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <CompanyContactCard lead={lead} onEdit={canEdit ? () => setEditOpen(true) : undefined} />
          <FilesPanel leadId={lead.id} files={lead.files} onChange={refresh} />
        </div>
      </div>

      <EditLeadModal open={editOpen} lead={lead} onClose={() => setEditOpen(false)} onSuccess={() => { setEditOpen(false); refresh(); }} />
      <HandoverModal open={handoverOpen} lead={lead} recipients={recipients} onClose={() => setHandoverOpen(false)} onSuccess={() => { setHandoverOpen(false); refresh(); }} />
      <RejectModal open={rejectOpen} leadId={lead.id} onClose={() => setRejectOpen(false)} onSuccess={() => { setRejectOpen(false); refresh(); }} />
      <QuickCallModal
        target={callOpen ? { leadId: lead.id, companyName: lead.company.name, contactName, phone: lead.contact?.phone } : null}
        onClose={() => setCallOpen(false)}
        onSuccess={() => { setCallOpen(false); refresh(); }}
      />
      <CloseDealModal
        open={closeDealOpen}
        leadId={lead.id}
        companyName={lead.company.name}
        finder={finder}
        recruiter={recruiter}
        onClose={() => setCloseDealOpen(false)}
        onSuccess={() => {
          setCloseDealOpen(false);
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
