"use client";

import { useEffect, useState } from "react";
import { addDays, addHours, format, setHours, setMinutes, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";
import { Phone } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/toast";
import { LEAD_STATUS_LABELS, REJECTION_REASON_LABELS } from "@/lib/labels";
import type { LeadStatus, RejectionReason } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

type Followup = "2h" | "tomorrow" | "3d" | "week" | "custom";

const NOT_INTERESTED = "Клиент не заинтересован";

/**
 * Итоги звонка. Выбор итога сразу подставляет срок следующего звонка —
 * оператору остаётся только нажать «Сохранить».
 */
const OUTCOMES: { label: string; followup: Followup; hint: string }[] = [
  { label: "Не дозвонились", followup: "tomorrow", hint: "Не взяли трубку или занято. Перезвоним завтра" },
  { label: "Поговорили с секретарём", followup: "tomorrow", hint: "До того, кто решает, пока не дошли" },
  { label: "Вышли на ЛПР", followup: "3d", hint: "Поговорили с тем, кто принимает решение. Лид сам перейдёт в «ЛПР найден»" },
  { label: "Попросили перезвонить", followup: "tomorrow", hint: "Поменяйте срок ниже, если назвали конкретный день" },
  { label: "Клиент заинтересован", followup: "3d", hint: "Есть интерес. Заполните в карточке, что узнали, и передайте руководителю" },
  { label: NOT_INTERESTED, followup: "week", hint: "Выберите причину — лид уйдёт в «Отказы» и пропадёт из очереди" },
];

const FOLLOWUPS: { value: Followup; label: string }[] = [
  { value: "2h", label: "Через 2 часа" },
  { value: "tomorrow", label: "Завтра" },
  { value: "3d", label: "Через 3 дня" },
  { value: "week", label: "Через неделю" },
  { value: "custom", label: "Дата…" },
];

/** Самые частые причины — остальные всё равно укладываются в «Другое». */
const QUICK_REASONS: RejectionReason[] = ["NO_NEED", "HAS_CONTRACTOR", "RECENT_WEBSITE", "EXPENSIVE", "NOT_NOW", "OTHER"];

/** Следующий звонок — в рабочее время: «завтра» и дальше ставим на 10:00. */
function followupDate(value: Followup, custom: string): Date | null {
  const now = new Date();
  const morning = (days: number) => setMinutes(setHours(startOfDay(addDays(now, days)), 10), 0);
  switch (value) {
    case "2h":
      return addHours(now, 2);
    case "tomorrow":
      return morning(1);
    case "3d":
      return morning(3);
    case "week":
      return morning(7);
    case "custom":
      return custom ? new Date(custom) : null;
  }
}

function Chip({
  active,
  onClick,
  children,
  tone = "primary",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "primary" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-md border px-3 py-2 text-left text-[13px] transition-colors",
        active
          ? tone === "danger"
            ? "border-danger-500 bg-danger-50 font-medium text-danger-700"
            : "border-primary-500 bg-primary-50 font-medium text-primary-700"
          : "border-border-default text-text-primary hover:border-primary-300 hover:bg-primary-50"
      )}
    >
      {children}
    </button>
  );
}

export interface QuickCallTarget {
  leadId: string;
  companyName: string;
  contactName?: string | null;
  phone?: string | null;
}

type QuickCallProps = {
  target: QuickCallTarget | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function QuickCallModal(props: QuickCallProps) {
  if (!props.target) return null;
  // key: каждый новый звонок — с чистой формы.
  return <QuickCallForm key={props.target.leadId} {...props} target={props.target} />;
}

function QuickCallForm({
  target,
  onClose,
  onSuccess,
}: QuickCallProps & { target: QuickCallTarget }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [followup, setFollowup] = useState<Followup>("tomorrow");
  const [customDate, setCustomDate] = useState("");
  const [reason, setReason] = useState<RejectionReason | null>(null);
  const [comment, setComment] = useState("");

  const rejecting = outcome === NOT_INTERESTED && reason !== null;

  function pickOutcome(o: (typeof OUTCOMES)[number]) {
    setOutcome(o.label);
    setFollowup(o.followup);
    if (o.label !== NOT_INTERESTED) setReason(null);
  }

  async function save() {
    if (loading) return;
    if (!outcome && !comment.trim()) {
      toast.error("Выберите, чем закончился звонок");
      return;
    }
    if (followup === "custom" && !customDate) {
      toast.error("Укажите дату следующего звонка");
      return;
    }
    // «Не заинтересован» без причины — не отказ: вернёмся к клиенту через неделю.
    const next = rejecting ? null : followupDate(followup, customDate);
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${target.leadId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "CALL",
          outcome: outcome ?? undefined,
          comment: comment.trim() || undefined,
          nextContactAt: next ? next.toISOString() : null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error("Не удалось записать звонок", body.error);
        return;
      }
      const body = await res.json().catch(() => ({}));

      if (rejecting) {
        const rej = await fetch(`/api/leads/${target.leadId}/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason, comment: comment.trim() || undefined }),
        });
        if (rej.ok) toast.success("Звонок записан, лид в отказах", target.companyName);
        else toast.error("Звонок записан, но отказ не сохранился");
      } else if (body.autoStatus) {
        toast.success("Звонок записан", `Лид перешёл в «${LEAD_STATUS_LABELS[body.autoStatus as LeadStatus]}»`);
      } else {
        toast.success(
          "Звонок записан",
          next ? `Следующий звонок: ${format(next, "d MMMM, HH:mm", { locale: ru })}` : target.companyName
        );
      }
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  // Клавиатура: цифры 1–6 выбирают итог, Enter / Ctrl+Enter сохраняет.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = e.target instanceof HTMLElement ? e.target.tagName : "";
      const inField = tag === "TEXTAREA" || tag === "INPUT";
      const onControl = tag === "BUTTON" || tag === "A";
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey || (!inField && !onControl))) {
        e.preventDefault();
        save();
        return;
      }
      if (inField || e.metaKey || e.ctrlKey || e.altKey) return;
      const idx = Number(e.key) - 1;
      if (idx >= 0 && idx < OUTCOMES.length) {
        e.preventDefault();
        pickOutcome(OUTCOMES[idx]);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const subtitle = [target.contactName, target.phone].filter(Boolean).join(" · ");

  return (
    <Modal
      open
      onClose={onClose}
      title={`Звонок · ${target.companyName}`}
      description={
        target.phone ? (
          <span className="inline-flex select-all items-center gap-1.5 text-text-primary">
            <Phone className="h-3.5 w-3.5 text-text-tertiary" />
            {subtitle}
          </span>
        ) : (
          subtitle || undefined
        )
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button variant={rejecting ? "danger" : "primary"} loading={loading} onClick={save}>
            {rejecting ? "Сохранить и в отказ" : "Сохранить"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-text-primary">Чем закончился звонок?</p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {OUTCOMES.map((o, i) => (
              <Tooltip key={o.label} content={o.hint} className="w-full">
                <Chip active={outcome === o.label} onClick={() => pickOutcome(o)}>
                  <span className="mr-1.5 hidden text-text-tertiary sm:inline">{i + 1}</span>
                  {o.label}
                </Chip>
              </Tooltip>
            ))}
          </div>
        </div>

        {outcome === NOT_INTERESTED ? (
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-text-primary">
              Почему отказался? <span className="font-normal text-text-tertiary">— лид уйдёт в «Отказы»</span>
            </p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {QUICK_REASONS.map((r) => (
                <Chip key={r} tone="danger" active={reason === r} onClick={() => setReason(reason === r ? null : r)}>
                  {REJECTION_REASON_LABELS[r]}
                </Chip>
              ))}
            </div>
            {!reason && (
              <p className="mt-1.5 text-xs text-text-tertiary">
                Не уверены, что это окончательный отказ? Не выбирайте причину — перезвоним через неделю
              </p>
            )}
          </div>
        ) : (
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-text-primary">Когда позвонить снова?</p>
            <div className="grid grid-cols-3 gap-1.5">
              {FOLLOWUPS.map((f) => (
                <Chip key={f.value} active={followup === f.value} onClick={() => setFollowup(f.value)}>
                  <span className="block text-center">{f.label}</span>
                </Chip>
              ))}
            </div>
            {followup === "custom" && (
              <div className="mt-2">
                <DatePicker withTime value={customDate} onChange={(e) => setCustomDate(e.target.value)} />
              </div>
            )}
            <p className="mt-1.5 text-xs text-text-tertiary">Лид сам появится в очереди «Звонки» в этот день</p>
          </div>
        )}

        <Textarea
          label="Комментарий (необязательно)"
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Коротко: о чём договорились"
        />
      </div>
    </Modal>
  );
}
