import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TimelineEntry {
  id: string;
  icon: ReactNode;
  iconTone?: "neutral" | "primary" | "success" | "warning" | "danger";
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  timestamp: string;
}

const TONE_CLASSES = {
  neutral: "bg-neutral-100 text-neutral-500",
  primary: "bg-primary-100 text-primary-600",
  success: "bg-success-100 text-success-600",
  warning: "bg-warning-100 text-warning-600",
  danger: "bg-danger-100 text-danger-600",
};

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <div className="relative">
      {entries.map((entry, i) => (
        <div key={entry.id} className="relative flex gap-3 pb-6 last:pb-0">
          {i !== entries.length - 1 && (
            <span className="absolute left-4 top-8 h-[calc(100%-1.5rem)] w-px bg-border-subtle" />
          )}
          <span
            className={cn(
              "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full [&>svg]:h-4 [&>svg]:w-4",
              TONE_CLASSES[entry.iconTone ?? "neutral"]
            )}
          >
            {entry.icon}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <p className="text-[13px] font-medium text-text-primary">{entry.title}</p>
              <span className="text-xs text-text-tertiary">{entry.timestamp}</span>
            </div>
            {entry.description && (
              <p className="mt-1 whitespace-pre-line text-[13px] text-text-secondary">
                {entry.description}
              </p>
            )}
            {entry.meta && <div className="mt-1.5">{entry.meta}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
