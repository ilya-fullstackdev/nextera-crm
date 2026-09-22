"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

export function ConfirmDeleteModal({
  open,
  title,
  description,
  confirmLabel = "Удалить",
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="danger" loading={loading} onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-50 text-danger-600">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <p className="text-[13px] text-text-primary">{description}</p>
      </div>
    </Modal>
  );
}
