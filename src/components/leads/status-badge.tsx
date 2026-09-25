"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { LEAD_STATUS_HINTS, LEAD_STATUS_LABELS, LEAD_STATUS_TONE } from "@/lib/labels";
import type { LeadStatus } from "@/generated/prisma/enums";

/** Статус лида с пояснением при наведении — что он значит и что дальше. */
export function StatusBadge({ status }: { status: LeadStatus | string }) {
  const s = status as LeadStatus;
  return (
    <Tooltip content={LEAD_STATUS_HINTS[s]}>
      <Badge tone={LEAD_STATUS_TONE[s]}>{LEAD_STATUS_LABELS[s]}</Badge>
    </Tooltip>
  );
}
