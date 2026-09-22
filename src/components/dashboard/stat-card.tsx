import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const TONE_CLASSES = {
  neutral: "bg-neutral-100 text-neutral-600",
  primary: "bg-primary-100 text-primary-600",
  warning: "bg-warning-100 text-warning-600",
  danger: "bg-danger-100 text-danger-600",
  success: "bg-success-100 text-success-600",
};

export function StatCard({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  tone?: keyof typeof TONE_CLASSES;
}) {
  return (
    <div className="rounded-lg border border-border-subtle bg-white p-4 shadow-xs">
      <div className="flex items-center gap-3">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-md [&>svg]:h-4.5 [&>svg]:w-4.5", TONE_CLASSES[tone])}>
          {icon}
        </span>
        <div>
          <p className="text-xl font-semibold tabular-nums text-text-primary">{value}</p>
          <p className="text-[12px] text-text-secondary">{label}</p>
        </div>
      </div>
    </div>
  );
}
