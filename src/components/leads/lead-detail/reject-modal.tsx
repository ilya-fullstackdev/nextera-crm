"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { REJECTION_REASON_LABELS } from "@/lib/labels";

export function RejectModal({
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
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) {
      toast.error("Укажите причину отказа");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, comment }),
      });
      if (!res.ok) {
        toast.error("Не удалось сохранить отказ");
        return;
      }
      toast.success("Лид переведён в отказ");
      setReason("");
      setComment("");
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Причина отказа"
      description="Укажите, почему клиент отказался"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="danger" loading={loading} onClick={handleSubmit}>
            Подтвердить отказ
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select label="Причина" placeholder="Выберите причину" value={reason} onChange={(e) => setReason(e.target.value)} required>
          {Object.entries(REJECTION_REASON_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <Textarea label="Комментарий" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
      </form>
    </Modal>
  );
}
