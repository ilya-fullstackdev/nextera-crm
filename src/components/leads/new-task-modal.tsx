"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
}

function defaultDueAt() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NewTaskModal({
  open,
  leadId,
  defaultAssigneeId,
  title,
  onClose,
  onSuccess,
}: {
  open: boolean;
  leadId?: string;
  defaultAssigneeId?: string;
  title?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "OTHER",
    dueAt: defaultDueAt(),
    comment: "",
    assigneeId: defaultAssigneeId ?? "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        title: "",
        type: "OTHER",
        dueAt: defaultDueAt(),
        comment: "",
        assigneeId: defaultAssigneeId ?? "",
      });
      fetch("/api/users")
        .then((r) => r.json())
        .then((d) => setUsers(d.users ?? []));
    }
  }, [open, defaultAssigneeId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, dueAt: new Date(form.dueAt).toISOString(), leadId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error("Не удалось создать задачу", data.error);
        return;
      }
      toast.success("Напоминание создано", form.title);
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title ?? "Напоминание"}
      description="Для встреч, писем и других дел. Звонки назначаются в окне звонка"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" loading={loading} onClick={handleSubmit}>
            Создать
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Что сделать"
          placeholder="Например: отправить КП на почту"
          required
          autoFocus
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <DatePicker
          label="Когда напомнить"
          withTime
          required
          value={form.dueAt}
          onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
        />
        <Select
          label="Ответственный"
          value={form.assigneeId}
          onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
        >
          <option value="">Я (по умолчанию)</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.firstName} {u.lastName}
            </option>
          ))}
        </Select>
        <Textarea
          label="Комментарий"
          rows={2}
          value={form.comment}
          onChange={(e) => setForm({ ...form, comment: e.target.value })}
        />
      </form>
    </Modal>
  );
}
