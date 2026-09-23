"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { LeadDetail, UserRef } from "@/types/lead";
import { NEED_LEVEL_LABELS, TIMELINE_LABELS, BUDGET_LABELS, ROLE_LABELS } from "@/lib/labels";
import type { Role } from "@/generated/prisma/enums";

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
  const [form, setForm] = useState({
    toUserId: "",
    dmInfo: "",
    needSummary: "",
    situation: "",
    problem: "",
    desiredResult: "",
    timeline: "",
    budget: "",
    discussed: "",
    objections: "",
    nextStep: "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        toUserId: "",
        dmInfo: lead.contact ? `${lead.contact.firstName} ${lead.contact.lastName ?? ""}${lead.contact.position ? ", " + lead.contact.position : ""}` : "",
        needSummary: lead.needDescription ?? NEED_LEVEL_LABELS[lead.needLevel],
        situation: lead.currentWebsite ? `Текущий сайт: ${lead.currentWebsite}` : "",
        problem: lead.problem ?? "",
        desiredResult: lead.desiredResult ?? "",
        timeline: TIMELINE_LABELS[lead.timeline],
        budget: `${BUDGET_LABELS[lead.budgetStatus]}${lead.budgetComment ? ". " + lead.budgetComment : ""}`,
        discussed: "",
        objections: "",
        nextStep: "",
      });
    }
  }, [open, lead]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.toUserId) {
      toast.error("Выберите, кому передать лид");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/handover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error("Не удалось передать лид", data.error);
        return;
      }
      const recipient = recipients.find((r) => r.id === form.toUserId);
      toast.success(
        "Лид передан",
        recipient ? `${recipient.firstName} ${recipient.lastName} · ${ROLE_LABELS[recipient.role as Role]}` : undefined
      );
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Передать лид"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" loading={loading} onClick={handleSubmit}>
            Передать
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Кому передать"
          placeholder="Выберите сотрудника"
          value={form.toUserId}
          onChange={(e) => setForm({ ...form, toUserId: e.target.value })}
          hint="Лид уходит руководителю вместе с брифингом"
          required
        >
          {recipients.map((r) => (
            <option key={r.id} value={r.id}>
              {r.firstName} {r.lastName} — {ROLE_LABELS[r.role as Role]}
            </option>
          ))}
        </Select>

        <Input label="Кто ЛПР" value={form.dmInfo} onChange={(e) => setForm({ ...form, dmInfo: e.target.value })} />
        <Textarea label="Потребность" rows={2} value={form.needSummary} onChange={(e) => setForm({ ...form, needSummary: e.target.value })} />
        <Textarea label="Текущая ситуация" rows={2} value={form.situation} onChange={(e) => setForm({ ...form, situation: e.target.value })} />
        <Textarea label="Проблема" rows={2} value={form.problem} onChange={(e) => setForm({ ...form, problem: e.target.value })} />
        <Textarea label="Желаемый результат" rows={2} value={form.desiredResult} onChange={(e) => setForm({ ...form, desiredResult: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Сроки" value={form.timeline} onChange={(e) => setForm({ ...form, timeline: e.target.value })} />
          <Input label="Бюджет" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
        </div>
        <Textarea label="Что обсуждали" rows={2} value={form.discussed} onChange={(e) => setForm({ ...form, discussed: e.target.value })} />
        <Textarea label="Возражения" rows={2} value={form.objections} onChange={(e) => setForm({ ...form, objections: e.target.value })} />
        <Textarea label="Следующий шаг" rows={2} value={form.nextStep} onChange={(e) => setForm({ ...form, nextStep: e.target.value })} />
      </form>
    </Modal>
  );
}
