"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { LeadDetail, UserRef } from "@/types/lead";
import { NEED_LEVEL_LABELS, TIMELINE_LABELS, BUDGET_LABELS, DM_STATUS_LABELS } from "@/lib/labels";

/**
 * Передача лида руководителю. Брифинг собирается из карточки сам —
 * оператор при желании добавляет один комментарий.
 */
export function HandoverModal({
  open,
  lead,
  recipients,
  onClose,
  onSuccess,
}: {
  open: boolean;
  lead: LeadDetail;
  recipients: UserRef[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [toUserId, setToUserId] = useState(recipients.length === 1 ? recipients[0].id : "");
  const [comment, setComment] = useState("");

  const brief: [string, string][] = [
    ["Кто решает", DM_STATUS_LABELS[lead.dmStatus]],
    ["Нужен ли сайт", NEED_LEVEL_LABELS[lead.needLevel]],
    ["Бюджет", BUDGET_LABELS[lead.budgetStatus]],
    ["Сроки", TIMELINE_LABELS[lead.timeline]],
    ...(lead.needDescription ? ([["Заметки", lead.needDescription]] as [string, string][]) : []),
  ];

  async function submit() {
    if (recipients.length > 1 && !toUserId) {
      toast.error("Выберите, кому передать лид");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/handover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: toUserId || undefined, comment: comment.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error("Не удалось передать лид", data.error);
        return;
      }
      toast.success("Лид передан руководителю", lead.company.name);
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Передать руководителю"
      description="Руководитель получит лид вместе с историей звонков и тем, что вы узнали"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" loading={loading} onClick={submit}>
            Передать
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {recipients.length > 1 && (
          <Select label="Кому" placeholder="Выберите руководителя" value={toUserId} onChange={(e) => setToUserId(e.target.value)}>
            {recipients.map((r) => (
              <option key={r.id} value={r.id}>
                {r.firstName} {r.lastName}
              </option>
            ))}
          </Select>
        )}
        {recipients.length === 1 && (
          <p className="text-[13px] text-text-secondary">
            Получатель: <span className="font-medium text-text-primary">{recipients[0].firstName} {recipients[0].lastName}</span>
          </p>
        )}

        <div className="rounded-md bg-neutral-50 p-3">
          <p className="mb-1.5 text-[12px] font-medium uppercase tracking-wide text-text-tertiary">Уйдёт в брифинге</p>
          <dl className="space-y-1 text-[13px]">
            {brief.map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="w-28 shrink-0 text-text-tertiary">{k}</dt>
                <dd className="min-w-0 text-text-primary">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <Textarea
          label="Что важно знать руководителю (необязательно)"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Например: ждёт звонка во вторник после обеда"
        />
      </div>
    </Modal>
  );
}
