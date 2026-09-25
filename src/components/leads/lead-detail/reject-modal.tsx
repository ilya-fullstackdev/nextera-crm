"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { useToast } from "@/components/ui/toast";
import { REJECTION_REASON_LABELS } from "@/lib/labels";
import type { RejectionReason } from "@/generated/prisma/enums";

const REASONS = Object.entries(REJECTION_REASON_LABELS).map(([value, label]) => ({
  value: value as RejectionReason,
  label,
}));

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
  const [reason, setReason] = useState<RejectionReason | null>(null);
  const [comment, setComment] = useState("");

  async function submit() {
    if (!reason) {
      toast.error("Выберите причину отказа");
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
      toast.success("Лид переведён в отказы");
      setReason(null);
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
      title="Клиент отказался"
      description="Лид уйдёт во вкладку «Отказы» и пропадёт из очереди звонков"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="danger" loading={loading} onClick={submit}>
            В отказы
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-text-primary">Почему?</p>
          <ChoiceChips options={REASONS} value={reason} onChange={setReason} />
        </div>
        <Textarea label="Комментарий (необязательно)" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
      </div>
    </Modal>
  );
}
