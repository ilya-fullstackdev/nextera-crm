import { Phone, CalendarClock } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PRIORITY_TONE = {
  HIGH: "danger",
  MEDIUM: "warning",
  LOW: "neutral",
} as const;

const PRIORITY_LABEL = {
  HIGH: "Высокий",
  MEDIUM: "Средний",
  LOW: "Низкий",
} as const;

export function KanbanCard({
  companyName,
  contactName,
  priority,
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
  priority: "HIGH" | "MEDIUM" | "LOW";
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
      className={cn(
        "cursor-pointer rounded-md border border-border-subtle bg-white p-3 shadow-xs transition-all",
        "hover:border-border-strong hover:shadow-sm",
        dragging && "opacity-40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-[13px] font-semibold text-text-primary">{companyName}</p>
        <Badge tone={PRIORITY_TONE[priority]}>{PRIORITY_LABEL[priority]}</Badge>
      </div>
      {contactName && (
        <p className="mt-1 flex items-center gap-1 truncate text-xs text-text-secondary">
          <Phone className="h-3 w-3 shrink-0" />
          {contactName}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between">
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
