"use client";

import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  /** Пояснение при наведении. */
  hint?: string;
}

/**
 * Выбор одним нажатием вместо выпадающего списка: все варианты сразу видны,
 * выбранный подсвечен.
 */
export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: ChoiceOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Tooltip key={o.value} content={o.hint}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => !active && onChange(o.value)}
              aria-pressed={active}
              className={cn(
                "h-8 rounded-full border px-3 text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                active
                  ? "border-primary-600 bg-primary-600 font-medium text-white"
                  : "border-border-default bg-white text-text-secondary hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
              )}
            >
              {o.label}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
