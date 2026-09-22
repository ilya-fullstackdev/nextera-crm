import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function FabButton({
  onClick,
  icon,
  label,
  className,
}: {
  onClick: () => void;
  icon?: ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "fixed right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition-transform active:scale-95 md:hidden",
        "bottom-[calc(1.25rem+env(safe-area-inset-bottom))]",
        className
      )}
    >
      <span className="[&>svg]:h-6 [&>svg]:w-6">{icon ?? <Plus />}</span>
    </button>
  );
}
