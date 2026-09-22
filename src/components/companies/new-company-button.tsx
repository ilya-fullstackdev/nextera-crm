"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FabButton } from "@/components/ui/fab-button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export function NewCompanyButton() {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", niche: "", city: "", website: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        toast.error("Не удалось создать компанию");
        return;
      }
      toast.success("Компания создана", form.name);
      setOpen(false);
      setForm({ name: "", niche: "", city: "", website: "" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="hidden md:block">
        <Button variant="primary" icon={<Plus />} onClick={() => setOpen(true)}>
          Добавить компанию
        </Button>
      </div>
      <FabButton label="Добавить компанию" onClick={() => setOpen(true)} />
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Новая компания"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
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
            label="Название компании"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Ниша"
              value={form.niche}
              onChange={(e) => setForm({ ...form, niche: e.target.value })}
            />
            <Input
              label="Город"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>
          <Input
            label="Сайт"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
          />
        </form>
      </Modal>
    </>
  );
}
