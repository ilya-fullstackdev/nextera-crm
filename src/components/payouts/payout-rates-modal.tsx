"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Percent, UserSearch, UserPlus, Minus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { ROLE_LABELS, ROLE_TONE } from "@/lib/labels";
import { calcPayout, formatMoney } from "@/lib/finance";
import type { Role } from "@/generated/prisma/enums";

export interface RateRow {
  role: Role;
  finderPercent: number;
  recruiterPercent: number;
  canFinder: boolean;
  canRecruiter: boolean;
}

/** На эту сумму показываем пример начисления — так процент понятнее. */
const SAMPLE_DEAL = 100_000;

const KIND = {
  finderPercent: {
    title: "За свой лид",
    hint: "Нашёл клиента и довёл до сделки",
    icon: <UserSearch />,
    empty: "Не ведёт лиды",
  },
  recruiterPercent: {
    title: "За приведённого сотрудника",
    hint: "Привёл в отдел того, кто нашёл лид",
    icon: <UserPlus />,
    empty: "Не занимается наймом",
  },
} as const;

function RateField({
  kind,
  value,
  disabled,
  onChange,
  label,
}: {
  kind: keyof typeof KIND;
  value: number;
  disabled: boolean;
  onChange: (raw: string) => void;
  label: string;
}) {
  const meta = KIND[kind];

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border-subtle p-3">
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md [&>svg]:h-4 [&>svg]:w-4 ${
          disabled ? "bg-neutral-100 text-neutral-400" : "bg-primary-50 text-primary-600"
        }`}
      >
        {disabled ? <Minus /> : meta.icon}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-text-primary">{meta.title}</p>
        <p className="mt-0.5 text-xs text-text-tertiary">{disabled ? meta.empty : meta.hint}</p>
      </div>

      {disabled ? (
        <span className="mt-1.5 shrink-0 text-[13px] text-text-tertiary">—</span>
      ) : (
        <div className="shrink-0 text-right">
          <div className="relative w-[84px]">
            <input
              inputMode="decimal"
              value={String(value)}
              aria-label={label}
              onChange={(e) => onChange(e.target.value)}
              className="h-10 w-full rounded-md border border-border-default bg-white pr-6 pl-2.5 text-right text-[14px] tabular-nums focus:border-primary-500 focus:ring-2 focus:ring-primary-500/40 focus:outline-none md:h-9"
            />
            <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[13px] text-text-tertiary">
              %
            </span>
          </div>
          <p className="mt-1 text-[11px] whitespace-nowrap text-text-tertiary tabular-nums">
            {formatMoney(calcPayout(SAMPLE_DEAL, value))}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Проценты меняют редко, поэтому настройка спрятана под кнопку и открывается
 * отдельным окном, а не занимает место над списком выплат.
 */
export function PayoutRatesModal({ initialRates }: { initialRates: RateRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [rates, setRates] = useState(initialRates);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setRates(initialRates);
  }, [open, initialRates]);

  function update(role: Role, field: "finderPercent" | "recruiterPercent", raw: string) {
    const value = Math.min(100, Math.max(0, Number(raw.replace(/[^\d.]/g, "") || 0)));
    setRates((prev) => prev.map((r) => (r.role === role ? { ...r, [field]: value } : r)));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/payout-rates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rates: rates.map((r) => ({
            role: r.role,
            finderPercent: r.finderPercent,
            recruiterPercent: r.recruiterPercent,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error("Не удалось сохранить проценты", data.error);
        return;
      }
      toast.success("Проценты сохранены", "Действуют для всех новых сделок");
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button variant="secondary" size="sm" icon={<Percent />} onClick={() => setOpen(true)}>
        Проценты по должностям
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Проценты по должностям"
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button variant="primary" loading={saving} onClick={save}>
              Сохранить
            </Button>
          </>
        }
      >
        <p className="text-[13px] text-text-secondary">
          Одинаковы для всех сделок. Суммы под полями — пример со сделки на {formatMoney(SAMPLE_DEAL)}.
        </p>

        <div className="mt-4 space-y-3">
          {rates.map((r) => (
            <div key={r.role} className="rounded-lg border border-border-subtle bg-surface-muted/30 p-3">
              <Badge tone={ROLE_TONE[r.role]}>{ROLE_LABELS[r.role]}</Badge>

              <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                <RateField
                  kind="finderPercent"
                  value={r.finderPercent}
                  disabled={!r.canFinder}
                  label={`${ROLE_LABELS[r.role]}: процент за свой лид`}
                  onChange={(raw) => update(r.role, "finderPercent", raw)}
                />
                <RateField
                  kind="recruiterPercent"
                  value={r.recruiterPercent}
                  disabled={!r.canRecruiter}
                  label={`${ROLE_LABELS[r.role]}: процент за приведённого сотрудника`}
                  onChange={(raw) => update(r.role, "recruiterPercent", raw)}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="mt-3 text-[12px] text-text-tertiary">
          Руководитель сам себе выплату не начисляет. Уже закрытые сделки при изменении процентов не
          пересчитываются.
        </p>
      </Modal>
    </>
  );
}
