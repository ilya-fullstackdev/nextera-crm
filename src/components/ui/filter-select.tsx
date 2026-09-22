"use client";

import { useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useClickOutside } from "@/hooks/use-click-outside";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

export function FilterSelect({
  label,
  value,
  options,
  onChange,
  allLabel = "Все",
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  allLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useClickOutside([rootRef], () => setOpen(false), open);

  const selected = options.find((o) => o.value === value);
  const active = Boolean(selected);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-[13px] font-medium transition-colors md:h-8",
          active
            ? "border-primary-300 bg-primary-50 text-primary-700"
            : "border-border-default bg-white text-text-secondary hover:bg-surface-hover"
        )}
      >
        {selected ? (
          <>
            <span className="text-text-tertiary">{label}:</span>
            {selected.label}
          </>
        ) : (
          label
        )}
        <ChevronDown className="h-3.5 w-3.5 text-text-tertiary" />
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-1.5 max-h-72 min-w-[200px] overflow-y-auto rounded-md border border-border-subtle bg-white py-1 shadow-popover">
          <button
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[13px] text-text-secondary hover:bg-surface-hover"
          >
            {allLabel}
            {!active && <Check className="h-3.5 w-3.5 text-primary-600" />}
          </button>
          <div className="my-1 h-px bg-border-subtle" />
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[13px] text-text-primary hover:bg-surface-hover"
            >
              <span className="truncate">{o.label}</span>
              {o.value === value && <Check className="h-3.5 w-3.5 shrink-0 text-primary-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
