import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  suffix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, icon, suffix, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-medium text-text-primary">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary [&>svg]:h-4 [&>svg]:w-4">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "h-11 w-full rounded-md border bg-white px-3 text-base text-text-primary placeholder:text-text-tertiary md:h-9 md:text-sm",
              "transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500",
              "disabled:bg-neutral-50 disabled:text-text-tertiary",
              error ? "border-danger-500" : "border-border-default hover:border-border-strong",
              icon && "pl-9",
              suffix && "pr-9",
              className
            )}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary">
              {suffix}
            </span>
          )}
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
Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-medium text-text-primary">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-md border bg-white px-3 py-2 text-base text-text-primary placeholder:text-text-tertiary md:text-sm",
            "transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500",
            "disabled:bg-neutral-50 disabled:text-text-tertiary resize-none",
            error ? "border-danger-500" : "border-border-default hover:border-border-strong",
            className
          )}
          {...props}
        />
        {error ? (
          <p className="mt-1 text-xs text-danger-600">{error}</p>
        ) : hint ? (
          <p className="mt-1 text-xs text-text-tertiary">{hint}</p>
        ) : null}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
