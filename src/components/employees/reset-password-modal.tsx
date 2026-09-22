"use client";

import { useEffect, useState } from "react";
import { Copy, Check, KeyRound } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { EmployeeRow } from "@/components/employees/employees-client";

export function ResetPasswordModal({
  employee,
  onClose,
}: {
  employee: EmployeeRow | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const [password, setPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (employee) {
      setPassword(null);
      setCopied(false);
    }
  }, [employee]);

  async function handleGenerate() {
    if (!employee) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}/reset-password`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Не удалось сбросить пароль", data.error);
        return;
      }
      setPassword(data.password);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleCopyCredentials() {
    if (!employee || !password) return;
    await navigator.clipboard.writeText(`Логин: ${employee.login}\nПароль: ${password}`);
    toast.success("Логин и пароль скопированы");
  }

  if (!employee) return null;

  return (
    <Modal
      open={Boolean(employee)}
      onClose={onClose}
      title="Сброс пароля"
      description={`${employee.firstName} ${employee.lastName} (${employee.login})`}
      footer={
        password ? (
          <>
            <Button variant="secondary" icon={<Copy />} onClick={handleCopyCredentials}>
              Копировать логин и пароль
            </Button>
            <Button variant="primary" onClick={onClose}>
              Готово
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Отмена
            </Button>
            <Button variant="primary" loading={loading} icon={<KeyRound />} onClick={handleGenerate}>
              Сгенерировать новый пароль
            </Button>
          </>
        )
      }
    >
      {password ? (
        <div>
          <p className="text-[13px] text-text-secondary">
            Новый пароль сгенерирован. Он показывается только один раз — сообщите его сотруднику.
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-md border border-border-default bg-neutral-50 px-3 py-2">
            <code className="flex-1 text-sm font-medium text-text-primary">{password}</code>
            <button onClick={handleCopy} className="text-text-tertiary hover:text-text-primary">
              {copied ? <Check className="h-4 w-4 text-success-600" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-[13px] text-text-secondary">
          Будет сгенерирован новый случайный пароль. Текущий пароль сотрудника перестанет работать.
        </p>
      )}
    </Modal>
  );
}
