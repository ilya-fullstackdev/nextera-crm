"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Plus, AlertTriangle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FabButton } from "@/components/ui/fab-button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS } from "@/lib/labels";
import { QuickCallModal, type QuickCallTarget } from "@/components/leads/quick-call-modal";

const emptyForm = {
  companyName: "",
  contactPhone: "",
  contactFirstName: "",
  website: "",
  city: "",
  niche: "",
  contactPosition: "",
  contactTelegram: "",
  contactEmail: "",
  source: "MANUAL_SEARCH",
};

interface DuplicateMatch {
  id: string;
  companyName: string;
  ownerName: string;
  status: string;
}

/**
 * Новый лид — минимум полей: название и телефон. Лида добавляют в момент
 * звонка (прямо перед ним или сразу после), поэтому после сохранения сразу
 * открывается окно итога звонка.
 */
export function NewLeadButton({
  label = "Новый лид",
  icon = <Plus />,
  withFab = false,
  shortLabel,
}: {
  label?: string;
  icon?: ReactNode;
  /** Плавающая кнопка «+» на телефоне. */
  withFab?: boolean;
  /** Короткая подпись, пока экран не очень широкий: «+ Лид». */
  shortLabel?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[] | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [callTarget, setCallTarget] = useState<QuickCallTarget | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "companyName" || key === "contactPhone" || key === "website") setDuplicates(null);
  }

  function reset() {
    // Источник запоминаем: лиды обычно вносят пачкой из одного места.
    setForm((prev) => ({ ...emptyForm, source: prev.source }));
    setDuplicates(null);
    setError(null);
  }

  function close() {
    setOpen(false);
    reset();
  }

  async function submit() {
    if (!form.companyName.trim()) {
      setError("Укажите название компании");
      nameRef.current?.focus();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, force: Boolean(duplicates) }),
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

      toast.success("Клиент добавлен", "Теперь запишите, чем закончился звонок");
      setCallTarget({
        leadId: data.lead.id,
        companyName: form.companyName.trim(),
        contactName: form.contactFirstName.trim() || null,
        phone: form.contactPhone.trim() || null,
      });
      setOpen(false);
      reset();
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className={withFab ? "hidden md:block" : undefined}>
        <Button variant="primary" icon={icon} onClick={() => setOpen(true)} title={label}>
          {shortLabel ? (
            <>
              <span className="2xl:hidden">{shortLabel}</span>
              <span className="hidden 2xl:inline">{label}</span>
            </>
          ) : (
            label
          )}
        </Button>
      </div>
      {withFab && <FabButton label={label} onClick={() => setOpen(true)} />}
      <Modal
        open={open}
        onClose={close}
        title="Новый клиент"
        description="Достаточно названия и телефона. Дальше откроется окно, куда записать итог звонка"
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Отмена
            </Button>
            <Button variant={duplicates ? "danger" : "primary"} loading={loading} onClick={submit}>
              {duplicates ? "Всё равно создать" : "Дальше: итог звонка"}
            </Button>
          </>
        }
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Input
            ref={nameRef}
            label="Название компании"
            required
            autoFocus
            placeholder="Например: Стоматология «Улыбка»"
            value={form.companyName}
            onChange={(e) => update("companyName", e.target.value)}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Телефон"
              type="tel"
              inputMode="tel"
              placeholder="+7 900 000-00-00"
              value={form.contactPhone}
              onChange={(e) => update("contactPhone", e.target.value)}
            />
            <Input
              label="Имя контакта"
              placeholder="Если знаете"
              value={form.contactFirstName}
              onChange={(e) => update("contactFirstName", e.target.value)}
            />
          </div>

          <button
            type="button"
            onClick={() => setMore((m) => !m)}
            className="flex items-center gap-1 text-[13px] font-medium text-primary-600 hover:text-primary-700"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${more ? "rotate-180" : ""}`} />
            {more ? "Скрыть дополнительные поля" : "Сайт, город, почта и другое"}
          </button>

          {more && (
            <div className="space-y-3 rounded-md bg-neutral-50 p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input label="Сайт" value={form.website} onChange={(e) => update("website", e.target.value)} />
                <Input label="Город" value={form.city} onChange={(e) => update("city", e.target.value)} />
                <Input label="Ниша" placeholder="Стоматология, автосервис…" value={form.niche} onChange={(e) => update("niche", e.target.value)} />
                <Input label="Должность контакта" value={form.contactPosition} onChange={(e) => update("contactPosition", e.target.value)} />
                <Input label="Telegram" value={form.contactTelegram} onChange={(e) => update("contactTelegram", e.target.value)} />
                <Input label="Email" value={form.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} />
              </div>
              <Select label="Где нашли клиента" value={form.source} onChange={(e) => update("source", e.target.value)}>
                {Object.entries(LEAD_SOURCE_LABELS).map(([value, l]) => (
                  <option key={value} value={value}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {duplicates && duplicates.length > 0 && (
            <div className="rounded-md border border-warning-100 bg-warning-50 p-3">
              <p className="flex items-center gap-1.5 text-[13px] font-medium text-warning-700">
                <AlertTriangle className="h-4 w-4" />
                Похоже, этот клиент уже есть в CRM
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

          {error && <p className="rounded-md bg-danger-50 px-3 py-2 text-[13px] text-danger-700">{error}</p>}
          {/* Enter в любом поле сохраняет форму. */}
          <button type="submit" className="hidden" />
        </form>
      </Modal>

      <QuickCallModal
        target={callTarget}
        onClose={() => {
          setCallTarget(null);
          router.refresh();
        }}
        onSuccess={() => {
          setCallTarget(null);
          router.refresh();
        }}
      />
    </>
  );
}
