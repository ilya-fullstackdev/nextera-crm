import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
  hint?: string;
  withTime?: boolean;
}

export const DatePicker = forwardRef<HTMLInputElement, DateFieldProps>(
  ({ className, label, error, hint, withTime, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    const Icon = withTime ? Clock : Calendar;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-medium text-text-primary">
            {label}
          </label>
        )}
        <div className="relative">
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            ref={ref}
            id={inputId}
            type={withTime ? "datetime-local" : "date"}
            className={cn(
              "h-9 w-full rounded-md border bg-white pl-9 pr-3 text-sm text-text-primary",
              "transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500",
              "disabled:bg-neutral-50 disabled:text-text-tertiary",
              error ? "border-danger-500" : "border-border-default hover:border-border-strong",
              className
            )}
            {...props}
          />
        </div>
        {error ? (
          <p className="mt-1 text-xs text-danger-600">{error}</p>
        ) : hint ? (
          <p className="mt-1 text-xs text-text-tertiary">{hint}</p>
        ) : null}
      </div>
    );
  }
);
DatePicker.displayName = "DatePicker";
