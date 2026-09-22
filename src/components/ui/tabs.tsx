"use client";

import { cn } from "@/lib/utils";

interface TabItem {
  value: string;
  label: string;
  count?: number;
}

export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1 overflow-x-auto border-b border-border-subtle", className)}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            onClick={() => onChange(item.value)}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-3 text-[13px] font-medium transition-colors md:py-2.5",
              active ? "text-primary-700" : "text-text-secondary hover:text-text-primary"
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                  active ? "bg-primary-100 text-primary-700" : "bg-neutral-100 text-neutral-500"
                )}
              >
                {item.count}
              </span>
            )}
            {active && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary-600" />
            )}
          </button>
        );
      })}
    </div>
  );
}
