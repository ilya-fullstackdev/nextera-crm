"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { LEAD_SOURCE_LABELS } from "@/lib/labels";
import type { LeadDetail } from "@/types/lead";

function formFrom(lead: LeadDetail) {
  return {
    companyName: lead.company.name,
    contactFirstName: lead.contact?.firstName ?? "",
    contactPhone: lead.contact?.phone ?? "",
    contactPosition: lead.contact?.position ?? "",
    contactTelegram: lead.contact?.telegram ?? "",
    contactEmail: lead.contact?.email ?? "",
    companyWebsite: lead.company.website ?? "",
    companyCity: lead.company.city ?? "",
    companyNiche: lead.company.niche ?? "",
    source: lead.source,
  };
}

/** Компания и контакт — в одной форме, без отдельных разделов «Компании» и «Контакты». */
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
  const [form, setForm] = useState(() => formFrom(lead));

  useEffect(() => {
    if (open) setForm(formFrom(lead));
  }, [open, lead]);

  function field(key: keyof typeof form) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value }),
    };
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!form.companyName.trim()) {
      toast.error("Укажите название компании");
      return;
    }
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
      title="Клиент и контакты"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" loading={loading} onClick={() => handleSubmit()}>
            Сохранить
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input label="Название компании" {...field("companyName")} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Телефон" type="tel" inputMode="tel" {...field("contactPhone")} />
          <Input label="Имя контакта" {...field("contactFirstName")} />
          <Input label="Должность" {...field("contactPosition")} />
          <Input label="Telegram" {...field("contactTelegram")} />
          <Input label="Email" {...field("contactEmail")} />
          <Input label="Сайт" {...field("companyWebsite")} />
          <Input label="Город" {...field("companyCity")} />
          <Input label="Ниша" {...field("companyNiche")} />
        </div>
        <Select
          label="Где нашли клиента"
          value={form.source}
          onChange={(e) => setForm({ ...form, source: e.target.value as typeof form.source })}
        >
          {Object.entries(LEAD_SOURCE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
