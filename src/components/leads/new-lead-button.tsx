"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FabButton } from "@/components/ui/fab-button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { LEAD_SOURCE_LABELS, PRIORITY_LABELS, LEAD_STATUS_LABELS } from "@/lib/labels";

const emptyForm = {
  companyName: "",
  niche: "",
  city: "",
  website: "",
  source: "MANUAL_SEARCH",
  priority: "MEDIUM",
  contactFirstName: "",
  contactLastName: "",
  contactPosition: "",
  contactPhone: "",
  contactTelegram: "",
  contactEmail: "",
};

interface DuplicateMatch {
  id: string;
  companyName: string;
  ownerName: string;
  status: string;
}

export function NewLeadButton() {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[] | null>(null);
  const [form, setForm] = useState(emptyForm);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function reset() {
    setForm(emptyForm);
    setDuplicates(null);
    setError(null);
  }

  async function submit(force: boolean) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, force }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 409 && data.duplicates) {
        setDuplicates(data.duplicates);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Не удалось создать лид");
        return;
      }

      toast.success("Лид создан", form.companyName);
      setOpen(false);
      reset();
      router.push(`/crm/leads/${data.lead.id}`);
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="hidden md:block">
        <Button variant="primary" icon={<Plus />} onClick={() => setOpen(true)}>
          Новый лид
        </Button>
      </div>
      <FabButton label="Новый лид" onClick={() => setOpen(true)} />
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title="Новый лид"
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setOpen(false);
                reset();
              }}
            >
              Отмена
            </Button>
            {duplicates ? (
              <Button variant="danger" loading={loading} onClick={() => submit(true)}>
                Всё равно создать
              </Button>
            ) : (
              <Button variant="primary" loading={loading} onClick={() => submit(false)}>
                Создать лид
              </Button>
            )}
          </>
        }
      >
        <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
          <div>
            <p className="mb-2.5 text-[13px] font-semibold text-text-primary">Компания</p>
            <div className="space-y-3">
              <Input
                label="Название компании"
                required
                value={form.companyName}
                onChange={(e) => {
                  update("companyName", e.target.value);
                  setDuplicates(null);
                }}
              />
              <div className="grid grid-cols-3 gap-3">
                <Input label="Ниша" value={form.niche} onChange={(e) => update("niche", e.target.value)} />
                <Input label="Город" value={form.city} onChange={(e) => update("city", e.target.value)} />
                <Input
                  label="Сайт"
                  value={form.website}
                  onChange={(e) => {
                    update("website", e.target.value);
                    setDuplicates(null);
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select label="Источник" value={form.source} onChange={(e) => update("source", e.target.value)}>
                  {Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                <Select label="Приоритет" value={form.priority} onChange={(e) => update("priority", e.target.value)}>
                  {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2.5 text-[13px] font-semibold text-text-primary">Контакт (необязательно)</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Имя"
                  value={form.contactFirstName}
                  onChange={(e) => update("contactFirstName", e.target.value)}
                />
                <Input
                  label="Фамилия"
                  value={form.contactLastName}
                  onChange={(e) => update("contactLastName", e.target.value)}
                />
              </div>
              <Input
                label="Должность"
                value={form.contactPosition}
                onChange={(e) => update("contactPosition", e.target.value)}
              />
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="Телефон"
                  value={form.contactPhone}
                  onChange={(e) => {
                    update("contactPhone", e.target.value);
                    setDuplicates(null);
                  }}
                />
                <Input
                  label="Telegram"
                  value={form.contactTelegram}
                  onChange={(e) => update("contactTelegram", e.target.value)}
                />
                <Input label="Email" value={form.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} />
              </div>
            </div>
          </div>

          {duplicates && duplicates.length > 0 && (
            <div className="rounded-md border border-warning-100 bg-warning-50 p-3">
              <p className="flex items-center gap-1.5 text-[13px] font-medium text-warning-700">
                <AlertTriangle className="h-4 w-4" />
                Похоже, эта компания уже есть в CRM
              </p>
              <div className="mt-2 space-y-1.5">
                {duplicates.map((d) => (
                  <a
                    key={d.id}
                    href={`/crm/leads/${d.id}`}
                    target="_blank"
                    className="block rounded-md bg-white px-2.5 py-1.5 text-[13px] text-text-primary hover:bg-neutral-50"
                  >
                    <span className="font-medium">{d.companyName}</span> — ответственный {d.ownerName},{" "}
                    {LEAD_STATUS_LABELS[d.status as keyof typeof LEAD_STATUS_LABELS]}
                  </a>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-md bg-danger-50 px-3 py-2 text-[13px] text-danger-700">{error}</p>
          )}
        </form>
      </Modal>
    </>
  );
}
