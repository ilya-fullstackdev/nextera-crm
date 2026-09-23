"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { EXPENSE_TYPE_LABELS } from "@/lib/labels";
import { EXPENSE_PERIOD_LABELS } from "@/lib/finance";
import type { ExpensePeriod, ExpenseType } from "@/generated/prisma/enums";

export interface ExpenseDraft {
  id?: string;
  type: ExpenseType;
  name: string;
  url: string;
  amount: string;
  period: ExpensePeriod;
  renewsAt: string;
  comment: string;
}

export const emptyExpense: ExpenseDraft = {
  type: "HOSTING",
  name: "",
  url: "",
  amount: "",
  period: "MONTHLY",
  renewsAt: "",
  comment: "",
};

/** Форма ежемесячного расхода: хостинг, домен, почта и т.п. */
export function ExpenseFormModal({
  open,
  dealId,
  expense,
  onClose,
  onSuccess,
}: {
  open: boolean;
  dealId: string;
  expense: ExpenseDraft | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<ExpenseDraft>(emptyExpense);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setForm(expense ?? emptyExpense);
  }, [open, expense]);

  function update<K extends keyof ExpenseDraft>(key: K, value: ExpenseDraft[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!form.name.trim()) {
      toast.error("Укажите название расхода");
      return;
    }
    setLoading(true);
    try {
      const isEdit = Boolean(form.id);
      const res = await fetch(isEdit ? `/api/expenses/${form.id}` : `/api/deals/${dealId}/expenses`, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          name: form.name.trim(),
          url: form.url.trim(),
          amount: Number(form.amount || 0),
          period: form.period,
          renewsAt: form.renewsAt || null,
          comment: form.comment.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error("Не удалось сохранить расход", data.error);
        return;
      }
      toast.success(isEdit ? "Расход обновлён" : "Расход добавлен", form.name.trim());
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={form.id ? "Изменить расход" : "Новый ежемесячный расход"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" loading={loading} onClick={() => handleSubmit()}>
            Сохранить
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select label="Тип" value={form.type} onChange={(e) => update("type", e.target.value as ExpenseType)}>
          {Object.entries(EXPENSE_TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Сумма, ₽"
            inputMode="numeric"
            value={form.amount}
            onChange={(e) => update("amount", e.target.value.replace(/[^\d]/g, ""))}
          />
          <Select
            label="Как часто платим"
            value={form.period}
            onChange={(e) => update("period", e.target.value as ExpensePeriod)}
          >
            {Object.entries(EXPENSE_PERIOD_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </div>

        <Input
          label="Название"
          placeholder="Хостинг Beget, домен nextera.ru"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          required
        />

        <Input
          label="Ссылка"
          placeholder="cp.beget.com"
          hint="Кнопка «Открыть» в списке расходов ведёт по этой ссылке"
          value={form.url}
          onChange={(e) => update("url", e.target.value)}
        />

        <DatePicker
          label="Следующее продление"
          value={form.renewsAt}
          onChange={(e) => update("renewsAt", e.target.value)}
        />

        <Textarea
          label="Комментарий"
          rows={2}
          value={form.comment}
          onChange={(e) => update("comment", e.target.value)}
        />
      </form>
    </Modal>
  );
}
