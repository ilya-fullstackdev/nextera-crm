"use client";

import { useState } from "react";
import { addDays, format, isPast, isToday, isTomorrow, setHours, setMinutes, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarClock } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

function morning(days: number) {
  return setMinutes(setHours(startOfDay(addDays(new Date(), days)), 10), 0);
}

const PRESETS: { label: string; hint: string; date: () => Date | null }[] = [
  { label: "Сегодня", hint: "Лид прямо сейчас появится в очереди «Звонки»", date: () => new Date() },
  { label: "Завтра", hint: "Завтра в 10:00", date: () => morning(1) },
  { label: "Через 3 дня", hint: "В 10:00", date: () => morning(3) },
  { label: "Через неделю", hint: "В 10:00", date: () => morning(7) },
];

function describe(iso: string | null) {
  if (!iso) return { text: "не назначен", tone: "text-warning-700" };
  const d = new Date(iso);
  if (isToday(d)) return { text: `сегодня, ${format(d, "HH:mm")}`, tone: "text-primary-700" };
  if (isPast(d)) return { text: `просрочен — ${format(d, "d MMMM", { locale: ru })}`, tone: "text-danger-600" };
  if (isTomorrow(d)) return { text: `завтра, ${format(d, "HH:mm")}`, tone: "text-text-primary" };
  return { text: format(d, "d MMMM, HH:mm", { locale: ru }), tone: "text-text-primary" };
}

/** Когда звонить в следующий раз — меняется одним нажатием, без календаря. */
export function NextCallPicker({
  leadId,
  nextContactAt,
  canEdit,
  onChange,
}: {
  leadId: string;
  nextContactAt: string | null;
  canEdit: boolean;
  onChange: () => void;
}) {
  const toast = useToast();
  const [value, setValue] = useState(nextContactAt);
  const [custom, setCustom] = useState(false);

  async function save(date: Date | null) {
    const iso = date ? date.toISOString() : null;
    const prev = value;
    setValue(iso);
    setCustom(false);
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nextContactAt: iso }),
    });
    if (!res.ok) {
      setValue(prev);
      toast.error("Не удалось сохранить дату");
      return;
    }
    toast.success(date ? "Звонок назначен" : "Звонок снят", date ? describe(iso).text : "Лид пропал из очереди звонков");
    onChange();
  }

  const current = describe(value);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <p className="flex shrink-0 items-center gap-1.5 text-[13px] text-text-secondary">
        <CalendarClock className="h-4 w-4 text-text-tertiary" />
        Следующий звонок: <span className={cn("font-semibold", current.tone)}>{current.text}</span>
      </p>
      {canEdit && (
        <div className="flex flex-wrap gap-1.5 sm:ml-auto">
          {PRESETS.map((p) => (
            <Tooltip key={p.label} content={p.hint}>
              <button
                type="button"
                onClick={() => save(p.date())}
                className="h-7 rounded-full border border-border-default bg-white px-2.5 text-[12px] text-text-secondary hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
              >
                {p.label}
              </button>
            </Tooltip>
          ))}
          {custom ? (
            <input
              type="datetime-local"
              autoFocus
              onChange={(e) => e.target.value && save(new Date(e.target.value))}
              onBlur={() => setCustom(false)}
              className="h-7 rounded-md border border-border-default px-2 text-[12px]"
            />
          ) : (
            <Tooltip content="Выбрать конкретный день и время">
              <button
                type="button"
                onClick={() => setCustom(true)}
                className="h-7 rounded-full border border-border-default bg-white px-2.5 text-[12px] text-text-secondary hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
              >
                Дата…
              </button>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );
}
