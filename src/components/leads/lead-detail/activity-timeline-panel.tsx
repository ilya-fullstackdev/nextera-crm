import { Phone, MessageSquare, Mail, Users as MeetingIcon, StickyNote, Tag, ArrowRightLeft, Paperclip, XCircle } from "lucide-react";
import { Timeline, type TimelineEntry } from "@/components/ui/timeline";
import { EmptyState } from "@/components/ui/empty-state";
import { ACTIVITY_TYPE_LABELS } from "@/lib/labels";
import { formatRelativeDay } from "@/lib/format";
import type { ActivityRef, HandoverRef } from "@/types/lead";

const ICONS = {
  CALL: Phone,
  MESSAGE: MessageSquare,
  EMAIL: Mail,
  MEETING: MeetingIcon,
  NOTE: StickyNote,
  STATUS_CHANGE: Tag,
  HANDOVER: ArrowRightLeft,
  FILE: Paperclip,
  REJECTION: XCircle,
} as const;

const TONES = {
  CALL: "primary",
  MESSAGE: "primary",
  EMAIL: "primary",
  MEETING: "primary",
  NOTE: "neutral",
  STATUS_CHANGE: "neutral",
  HANDOVER: "warning",
  FILE: "neutral",
  REJECTION: "danger",
} as const;

export function ActivityTimelinePanel({
  activities,
  handovers,
}: {
  activities: ActivityRef[];
  handovers: HandoverRef[];
}) {
  if (activities.length === 0) {
    return <EmptyState icon={<StickyNote />} title="Пока нет активности" description="Добавьте первую активность или задачу по лиду" />;
  }

  const entries: TimelineEntry[] = activities.map((activity) => {
    const handover = activity.type === "HANDOVER" ? handovers.find((h) => Math.abs(new Date(h.createdAt).getTime() - new Date(activity.createdAt).getTime()) < 5000) : undefined;
    const Icon = ICONS[activity.type];
    return {
      id: activity.id,
      icon: <Icon />,
      iconTone: TONES[activity.type],
      title: (
        <span>
          <span className="font-semibold">
            {activity.user.firstName} {activity.user.lastName}
          </span>{" "}
          · {ACTIVITY_TYPE_LABELS[activity.type]}
        </span>
      ),
      description: activity.comment,
      timestamp: formatRelativeDay(activity.createdAt),
      meta: handover ? (
        <div className="rounded-md border border-warning-100 bg-warning-50 p-2.5 text-[12px] text-text-secondary">
          {handover.needSummary && <p><span className="font-medium">Потребность:</span> {handover.needSummary}</p>}
          {handover.problem && <p><span className="font-medium">Проблема:</span> {handover.problem}</p>}
          {handover.budget && <p><span className="font-medium">Бюджет:</span> {handover.budget}</p>}
          {handover.objections && <p><span className="font-medium">Возражения:</span> {handover.objections}</p>}
          {handover.nextStep && <p><span className="font-medium">Следующий шаг:</span> {handover.nextStep}</p>}
        </div>
      ) : undefined,
    };
  });

  return (
    <div className="rounded-lg border border-border-subtle bg-white p-5 shadow-xs">
      <Timeline entries={entries} />
    </div>
  );
}
