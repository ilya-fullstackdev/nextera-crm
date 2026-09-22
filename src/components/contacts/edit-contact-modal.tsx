"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface ContactLike {
  id: string;
  firstName: string;
  lastName: string | null;
  position: string | null;
  phone: string | null;
  telegram: string | null;
  email: string | null;
}

export function EditContactModal({ contact, onClose }: { contact: ContactLike | null; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", position: "", phone: "", telegram: "", email: "" });

  useEffect(() => {
    if (contact) {
      setForm({
        firstName: contact.firstName,
        lastName: contact.lastName ?? "",
        position: contact.position ?? "",
        phone: contact.phone ?? "",
        telegram: contact.telegram ?? "",
        email: contact.email ?? "",
      });
    }
  }, [contact]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contact) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        toast.error("Не удалось сохранить контакт");
        return;
      }
      toast.success("Контакт обновлён", form.firstName);
      onClose();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={Boolean(contact)}
      onClose={onClose}
      title="Редактировать контакт"
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
        <div className="grid grid-cols-2 gap-3">
          <Input label="Имя" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          <Input label="Фамилия" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
        </div>
        <Input label="Должность" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
        <div className="grid grid-cols-3 gap-3">
          <Input label="Телефон" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Telegram" value={form.telegram} onChange={(e) => setForm({ ...form, telegram: e.target.value })} />
          <Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
      </form>
    </Modal>
  );
}
