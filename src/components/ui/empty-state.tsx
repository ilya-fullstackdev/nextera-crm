import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-8 text-center">
      {icon && (
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-text-tertiary [&>svg]:h-5 [&>svg]:w-5">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-text-primary">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-text-secondary">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
