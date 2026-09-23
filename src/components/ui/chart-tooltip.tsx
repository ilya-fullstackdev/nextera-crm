import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Подсказка при наведении на элемент графика.
 * Работает на чистом CSS, поэтому графики остаются серверными компонентами.
 * Родителю нужен класс `group relative`.
 */
export function ChartTooltip({
  children,
  className,
  align = "center",
}: {
  children: ReactNode;
  className?: string;
  align?: "center" | "start";
}) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute bottom-[calc(100%+6px)] z-20 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-[12px] font-medium text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100",
        align === "center" ? "left-1/2 -translate-x-1/2" : "left-0",
        className
      )}
    >
      {children}
    </span>
  );
}
