"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ACTIVITY_TYPE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

const QUICK_RESULTS = [
  "Не дозвонились",
  "Поговорили с секретарём",
  "Вышли на ЛПР",
  "Клиент попросил перезвонить",
  "Клиент заинтересован",
  "Клиент не заинтересован",
];

const LOGGABLE_TYPES = ["CALL", "MESSAGE", "EMAIL", "MEETING", "NOTE"] as const;

export function AddActivityModal({
  open,
  leadId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  leadId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<(typeof LOGGABLE_TYPES)[number]>("CALL");
  const [comment, setComment] = useState("");
  const [nextContactAt, setNextContactAt] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) {
      toast.error("Добавьте комментарий");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, comment, nextContactAt: nextContactAt || undefined }),
      });
      if (!res.ok) {
        toast.error("Не удалось сохранить активность");
        return;
      }
      toast.success("Активность добавлена");
      setComment("");
      setNextContactAt("");
      setType("CALL");
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Добавить активность"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" loading={loading} onClick={handleSubmit}>
            Сохранить
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select label="Тип" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          {LOGGABLE_TYPES.map((t) => (
            <option key={t} value={t}>
              {ACTIVITY_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>

        {type === "CALL" && (
          <div className="flex flex-wrap gap-1.5">
            {QUICK_RESULTS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setComment((c) => (c ? c : r))}
                className={cn(
                  "rounded-full border border-border-default px-2.5 py-1 text-[12px] text-text-secondary hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        )}

        <Textarea
          label="Комментарий"
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Что обсудили, какая реакция клиента, договорённости..."
          required
        />

        <DatePicker
          label="Следующий контакт (необязательно)"
          withTime
          value={nextContactAt}
          onChange={(e) => setNextContactAt(e.target.value)}
          hint="Если указать дату, автоматически создастся задача на повторный контакт"
        />
      </form>
    </Modal>
  );
}
