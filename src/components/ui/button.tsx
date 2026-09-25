import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dangerOutline" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-xs disabled:bg-neutral-300",
  secondary:
    "bg-white text-text-primary border border-border-default hover:bg-surface-hover shadow-xs disabled:text-text-tertiary",
  outline:
    "bg-transparent text-primary-700 border border-primary-200 hover:bg-primary-50 disabled:text-text-tertiary disabled:border-border-default",
  ghost:
    "bg-transparent text-text-secondary hover:bg-surface-hover hover:text-text-primary disabled:text-text-tertiary",
  // Заметное, но не главное опасное действие — например, «Отказ».
  dangerOutline:
    "bg-white text-danger-600 border border-danger-100 hover:border-danger-500 hover:bg-danger-50 shadow-xs disabled:text-text-tertiary",
  danger:
    "bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-700 shadow-xs disabled:bg-neutral-300",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3 text-[13px] gap-1.5 rounded-md md:h-8",
  md: "h-11 px-3.5 text-sm gap-2 rounded-md md:h-9",
  lg: "h-12 px-4 text-sm gap-2 rounded-lg md:h-10",
  icon: "h-11 w-11 rounded-md justify-center md:h-9 md:w-9",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "secondary",
      size = "md",
      loading,
      icon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center font-medium transition-colors duration-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1",
          "disabled:cursor-not-allowed disabled:shadow-none",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          icon && <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
