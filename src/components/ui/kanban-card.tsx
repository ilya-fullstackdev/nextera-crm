import { User, CalendarClock } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function KanbanCard({
  companyName,
  contactName,
  stage,
  owner,
  nextContactAt,
  draggable,
  dragging,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  companyName: string;
  contactName?: string | null;
  /** Точный этап, если колонка объединяет несколько. */
  stage?: string | null;
  owner: { firstName: string; lastName: string };
  nextContactAt?: string | null;
  draggable?: boolean;
  dragging?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onClick?: () => void;
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      title="Перетащите в другую колонку, чтобы сменить этап. Нажмите, чтобы открыть"
      className={cn(
        "cursor-pointer rounded-md border border-border-subtle bg-white p-3 shadow-xs transition-all",
        "hover:border-border-strong hover:shadow-sm",
        dragging && "opacity-40"
      )}
    >
      <p className="truncate text-[13px] font-semibold text-text-primary">{companyName}</p>
      {contactName && (
        <p className="mt-1 flex items-center gap-1 truncate text-xs text-text-secondary">
          <User className="h-3 w-3 shrink-0" />
          {contactName}
        </p>
      )}
      {stage && <p className="mt-1.5 text-[11px] font-medium text-primary-700">{stage}</p>}
      <div className="mt-2.5 flex items-center justify-between">
        {nextContactAt ? (
          <span className="flex items-center gap-1 text-[11px] text-text-tertiary">
            <CalendarClock className="h-3 w-3" />
            {nextContactAt}
          </span>
        ) : (
          <span />
        )}
        <Avatar firstName={owner.firstName} lastName={owner.lastName} size="xs" />
      </div>
    </div>
  );
}
