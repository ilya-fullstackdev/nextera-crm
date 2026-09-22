"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface CompanyLike {
  id: string;
  name: string;
  niche: string | null;
  city: string | null;
  website: string | null;
}

export function EditCompanyModal({
  company,
  onClose,
}: {
  company: CompanyLike | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", niche: "", city: "", website: "" });

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name,
        niche: company.niche ?? "",
        city: company.city ?? "",
        website: company.website ?? "",
      });
    }
  }, [company]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        toast.error("Не удалось сохранить компанию");
        return;
      }
      toast.success("Компания обновлена", form.name);
      onClose();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={Boolean(company)}
      onClose={onClose}
      title="Редактировать компанию"
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
        <Input label="Название компании" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Ниша" value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })} />
          <Input label="Город" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <Input label="Сайт" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
      </form>
    </Modal>
  );
}
