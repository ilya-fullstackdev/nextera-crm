"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { ChoiceChips, type ChoiceOption } from "@/components/ui/choice-chips";
import { Hint } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/toast";
import { LEAD_STATUS_LABELS } from "@/lib/labels";
import type { BudgetStatus, DealTimeline, DecisionMakerStatus, LeadStatus, NeedLevel } from "@/generated/prisma/enums";
import type { LeadDetail } from "@/types/lead";

/**
 * Квалификация — четыре вопроса с вариантами ответа вместо одиннадцати полей.
 * Каждый ответ сохраняется сразу, лид сам двигается по этапам.
 */

const DM: ChoiceOption<DecisionMakerStatus>[] = [
  { value: "NOT_FOUND", label: "Ещё не нашли" },
  { value: "FOUND", label: "Нашли", hint: "Знаем, кто решает, и можем с ним поговорить" },
  { value: "MULTIPLE", label: "Решают несколько", hint: "Например, директор и маркетолог вместе" },
];

const NEED: ChoiceOption<NeedLevel>[] = [
  { value: "NONE", label: "Не знаем" },
  { value: "POTENTIAL", label: "Возможно", hint: "Интерес есть, но клиент пока не уверен" },
  { value: "CONFIRMED", label: "Да, нужен", hint: "Клиент прямо сказал, что хочет сайт или доработку" },
];

const BUDGET: ChoiceOption<BudgetStatus>[] = [
  { value: "UNKNOWN", label: "Не знаем" },
  { value: "ESTIMATE", label: "Примерно понятен", hint: "Назвали вилку или порядок суммы" },
  { value: "DEFINED", label: "Точно известен" },
  { value: "NONE", label: "Денег нет" },
];

const TIMELINE: ChoiceOption<DealTimeline>[] = [
  { value: "UNDEFINED", label: "Не ясно" },
  { value: "NOW", label: "Сейчас" },
  { value: "ONE_TO_THREE_MONTHS", label: "1–3 месяца" },
  { value: "THREE_TO_SIX_MONTHS", label: "3–6 месяцев" },
];

// Руками выбрать «участвует» нельзя, но старые лиды могут его хранить — показываем как «Нашли».
function dmValue(v: DecisionMakerStatus): DecisionMakerStatus {
  return v === "PARTICIPATES" ? "FOUND" : v;
}

function Question({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-text-primary">
        {title}
        {hint && <Hint>{hint}</Hint>}
      </p>
      {children}
    </div>
  );
}

export function QualificationCard({
  lead,
  canEdit,
  onChange,
}: {
  lead: LeadDetail;
  canEdit: boolean;
  onChange: () => void;
}) {
  const toast = useToast();
  const [values, setValues] = useState({
    dmStatus: dmValue(lead.dmStatus),
    needLevel: lead.needLevel,
    budgetStatus: lead.budgetStatus,
    timeline: lead.timeline,
  });
  const [notes, setNotes] = useState(lead.needDescription ?? "");
  const [savedNotes, setSavedNotes] = useState(lead.needDescription ?? "");

  async function patch(data: Record<string, unknown>) {
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      toast.error("Не удалось сохранить");
      return false;
    }
    const body = await res.json().catch(() => ({}));
    // Статус двигается сам — говорим об этом, чтобы переход не выглядел случайным.
    if (body.autoStatus) {
      toast.success("Лид перешёл на следующий этап", LEAD_STATUS_LABELS[body.autoStatus as LeadStatus]);
    }
    onChange();
    return true;
  }

  async function choose<K extends keyof typeof values>(field: K, value: (typeof values)[K]) {
    const prev = values[field];
    setValues((v) => ({ ...v, [field]: value }));
    const ok = await patch({ [field]: value });
    if (!ok) setValues((v) => ({ ...v, [field]: prev }));
  }

  async function saveNotes() {
    if (notes === savedNotes) return;
    if (await patch({ needDescription: notes })) setSavedNotes(notes);
  }

  const answered = [
    values.dmStatus !== "NOT_FOUND",
    values.needLevel !== "NONE",
    values.budgetStatus !== "UNKNOWN",
    values.timeline !== "UNDEFINED",
  ].filter(Boolean).length;

  return (
    <Card>
      <CardHeader
        title="Что узнали о клиенте"
        description={
          answered === 4
            ? "Всё заполнено — можно передавать руководителю"
            : `Отвечено ${answered} из 4. Нажмите на вариант — сохранится сразу`
        }
        action={
          <div className="flex gap-1" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`h-1.5 w-5 rounded-full ${i < answered ? "bg-primary-600" : "bg-neutral-200"}`} />
            ))}
          </div>
        }
      />
      <CardBody className="space-y-4">
        <Question title="Кто принимает решение?" hint="ЛПР — тот, кто решает, заказывать ли сайт. Обычно владелец или директор">
          <ChoiceChips options={DM} value={values.dmStatus} disabled={!canEdit} onChange={(v) => choose("dmStatus", v)} />
        </Question>
        <Question title="Нужен ли клиенту сайт?">
          <ChoiceChips options={NEED} value={values.needLevel} disabled={!canEdit} onChange={(v) => choose("needLevel", v)} />
        </Question>
        <Question title="Бюджет">
          <ChoiceChips
            options={BUDGET}
            value={values.budgetStatus}
            disabled={!canEdit}
            onChange={(v) => choose("budgetStatus", v)}
          />
        </Question>
        <Question title="Когда нужен сайт?">
          <ChoiceChips options={TIMELINE} value={values.timeline} disabled={!canEdit} onChange={(v) => choose("timeline", v)} />
        </Question>

        <div>
          <Textarea
            label="Заметки о клиенте"
            disabled={!canEdit}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
            placeholder="Что хочет, что не нравится в текущем сайте, с кем работает сейчас…"
          />
          <p className="mt-1 flex items-center gap-1 text-xs text-text-tertiary">
            {notes !== savedNotes ? (
              "Сохранится, когда кликнете мимо поля"
            ) : savedNotes ? (
              <>
                <Check className="h-3 w-3 text-success-600" /> Сохранено
              </>
            ) : (
              "Руководитель увидит это при передаче лида"
            )}
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
