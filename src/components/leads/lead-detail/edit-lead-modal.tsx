"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { PRIORITY_LABELS, LEAD_SOURCE_LABELS } from "@/lib/labels";
import type { LeadDetail } from "@/types/lead";

export function EditLeadModal({
  open,
  lead,
  onClose,
  onSuccess,
}: {
  open: boolean;
  lead: LeadDetail;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    companyName: lead.company.name,
    companyNiche: lead.company.niche ?? "",
    companyCity: lead.company.city ?? "",
    companyWebsite: lead.company.website ?? "",
    priority: lead.priority,
    source: lead.source,
  });

  useEffect(() => {
    if (open) {
      setForm({
        companyName: lead.company.name,
        companyNiche: lead.company.niche ?? "",
        companyCity: lead.company.city ?? "",
        companyWebsite: lead.company.website ?? "",
        priority: lead.priority,
        source: lead.source,
      });
    }
  }, [open, lead]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error("Не удалось сохранить", data.error);
        return;
      }
      toast.success("Изменения сохранены");
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Редактировать лид"
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
        <Input
          label="Название компании"
          value={form.companyName}
          onChange={(e) => setForm({ ...form, companyName: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Ниша" value={form.companyNiche} onChange={(e) => setForm({ ...form, companyNiche: e.target.value })} />
          <Input label="Город" value={form.companyCity} onChange={(e) => setForm({ ...form, companyCity: e.target.value })} />
        </div>
        <Input label="Сайт" value={form.companyWebsite} onChange={(e) => setForm({ ...form, companyWebsite: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Приоритет" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as typeof form.priority })}>
            {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
          <Select label="Источник" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as typeof form.source })}>
            {Object.entries(LEAD_SOURCE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </div>
      </form>
    </Modal>
  );
}
