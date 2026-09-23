import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const TONE_CLASSES = {
  neutral: { chip: "bg-neutral-100 text-neutral-600", meter: "bg-neutral-400" },
  primary: { chip: "bg-primary-50 text-primary-600", meter: "bg-primary-600" },
  info: { chip: "bg-info-50 text-info-600", meter: "bg-info-600" },
  warning: { chip: "bg-warning-50 text-warning-600", meter: "bg-warning-600" },
  danger: { chip: "bg-danger-50 text-danger-600", meter: "bg-danger-600" },
  success: { chip: "bg-success-50 text-success-600", meter: "bg-success-600" },
};

export type StatTone = keyof typeof TONE_CLASSES;

export function StatCard({
  icon,
  label,
  value,
  tone = "neutral",
  hint,
  share,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  tone?: StatTone;
  /** Короткое пояснение под числом. */
  hint?: string;
  /** Доля 0…1 — рисует шкалу под числом. */
  share?: number;
  href?: string;
}) {
  const tones = TONE_CLASSES[tone];
  const pct = share === undefined ? null : Math.min(100, Math.max(0, share * 100));

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] leading-tight font-medium text-text-secondary">{label}</p>
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md [&>svg]:h-4 [&>svg]:w-4",
            tones.chip
          )}
        >
          {icon}
        </span>
      </div>

      {/* Крупное число — пропорциональные цифры, так оно не выглядит разреженным. */}
      <p className="mt-2.5 text-[26px] leading-none font-semibold text-text-primary">{value}</p>

      {hint && <p className="mt-1.5 text-[12px] leading-tight text-text-tertiary">{hint}</p>}

      {pct !== null && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-[4px] bg-neutral-100">
          <div
            className={cn("h-full rounded-r-[4px]", tones.meter)}
            style={{ width: `${pct === 0 ? 0 : Math.max(pct, 2)}%` }}
          />
        </div>
      )}
    </>
  );

  const className =
    "block rounded-lg border border-border-subtle bg-white p-4 shadow-xs transition-shadow";

  if (href) {
    return (
      <Link href={href} className={cn(className, "hover:border-border-default hover:shadow-sm")}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
