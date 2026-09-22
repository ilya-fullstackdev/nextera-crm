"use client";

import { useState } from "react";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/components/ui/toast";
import {
  DM_STATUS_LABELS,
  NEED_LEVEL_LABELS,
  TIMELINE_LABELS,
  BUDGET_LABELS,
  INTEREST_LABELS,
} from "@/lib/labels";
import type { LeadDetail } from "@/types/lead";

async function patchLead(leadId: string, data: Record<string, unknown>) {
  const res = await fetch(`/api/leads/${leadId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.ok;
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
  const [local, setLocal] = useState({
    needDescription: lead.needDescription ?? "",
    currentWebsite: lead.currentWebsite ?? "",
    problem: lead.problem ?? "",
    desiredResult: lead.desiredResult ?? "",
    budgetComment: lead.budgetComment ?? "",
    currentContractor: lead.currentContractor ?? "",
    nextContactAt: lead.nextContactAt ? lead.nextContactAt.slice(0, 10) : "",
  });

  async function saveSelect(field: string, value: string) {
    const ok = await patchLead(lead.id, { [field]: value });
    if (ok) {
      toast.success("Сохранено");
      onChange();
    } else {
      toast.error("Не удалось сохранить");
    }
  }

  async function saveText(field: keyof typeof local) {
    const value = local[field];
    const original =
      field === "nextContactAt"
        ? lead.nextContactAt
          ? lead.nextContactAt.slice(0, 10)
          : ""
        : ((lead[field as keyof LeadDetail] as string | null) ?? "");
    if (value === original) return;
    const payload = field === "nextContactAt" ? { nextContactAt: value || null } : { [field]: value };
    const ok = await patchLead(lead.id, payload);
    if (ok) {
      toast.success("Сохранено");
      onChange();
    } else {
      toast.error("Не удалось сохранить");
    }
  }

  return (
    <Card>
      <CardHeader title="Квалификация" description={`Попыток контакта: ${lead.contactAttempts}`} />
      <CardBody className="space-y-3">
        <Select
          label="ЛПР"
          disabled={!canEdit}
          defaultValue={lead.dmStatus}
          onChange={(e) => saveSelect("dmStatus", e.target.value)}
        >
          {Object.entries(DM_STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>

        <Select
          label="Потребность"
          disabled={!canEdit}
          defaultValue={lead.needLevel}
          onChange={(e) => saveSelect("needLevel", e.target.value)}
        >
          {Object.entries(NEED_LEVEL_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>

        <Textarea
          label="Описание потребности"
          disabled={!canEdit}
          rows={2}
          value={local.needDescription}
          onChange={(e) => setLocal((s) => ({ ...s, needDescription: e.target.value }))}
          onBlur={() => saveText("needDescription")}
        />

        <Textarea
          label="Проблема"
          disabled={!canEdit}
          rows={2}
          value={local.problem}
          onChange={(e) => setLocal((s) => ({ ...s, problem: e.target.value }))}
          onBlur={() => saveText("problem")}
        />

        <Textarea
          label="Желаемый результат"
          disabled={!canEdit}
          rows={2}
          value={local.desiredResult}
          onChange={(e) => setLocal((s) => ({ ...s, desiredResult: e.target.value }))}
          onBlur={() => saveText("desiredResult")}
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Сроки"
            disabled={!canEdit}
            defaultValue={lead.timeline}
            onChange={(e) => saveSelect("timeline", e.target.value)}
          >
            {Object.entries(TIMELINE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
          <Select
            label="Бюджет"
            disabled={!canEdit}
            defaultValue={lead.budgetStatus}
            onChange={(e) => saveSelect("budgetStatus", e.target.value)}
          >
            {Object.entries(BUDGET_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </div>

        <Textarea
          label="Комментарий к бюджету"
          disabled={!canEdit}
          rows={1}
          value={local.budgetComment}
          onChange={(e) => setLocal((s) => ({ ...s, budgetComment: e.target.value }))}
          onBlur={() => saveText("budgetComment")}
        />

        <Select
          label="Уровень интереса"
          disabled={!canEdit}
          defaultValue={lead.interestLevel ?? ""}
          onChange={(e) => saveSelect("interestLevel", e.target.value)}
        >
          <option value="">Не определён</option>
          {Object.entries(INTEREST_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>

        <Textarea
          label="Текущий подрядчик"
          disabled={!canEdit}
          rows={1}
          value={local.currentContractor}
          onChange={(e) => setLocal((s) => ({ ...s, currentContractor: e.target.value }))}
          onBlur={() => saveText("currentContractor")}
        />

        <DatePicker
          label="Следующий контакт"
          disabled={!canEdit}
          value={local.nextContactAt}
          onChange={(e) => setLocal((s) => ({ ...s, nextContactAt: e.target.value }))}
          onBlur={() => saveText("nextContactAt")}
        />
      </CardBody>
    </Card>
  );
}
