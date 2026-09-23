import { LEAD_STATUS_LABELS } from "@/lib/labels";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/generated/prisma/enums";

/** Основной путь лида. Отказ и «перезвонить позже» лежат вне него. */
const STAGE_FLOW: LeadStatus[] = [
  "NEW",
  "SEARCHING_DM",
  "FIRST_CONTACT",
  "DM_FOUND",
  "QUALIFICATION",
  "HANDED_TO_MANAGER",
  "NEGOTIATION",
  "PROPOSAL_SENT",
  "DEAL",
];

/**
 * Полоса прогресса по воронке: сразу видно, на каком шаге лид и сколько
 * осталось до сделки. Каждый сегмент подписан при наведении.
 */
export function LeadProgress({ status }: { status: LeadStatus }) {
  const current = STAGE_FLOW.indexOf(status);
  const offPath = current === -1;

  return (
    <div>
      <div className="flex items-center gap-[3px]">
        {STAGE_FLOW.map((stage, i) => {
          const done = !offPath && i <= current;
          const isCurrent = !offPath && i === current;
          return (
            <div key={stage} className="group relative h-1.5 flex-1">
              <div
                className={cn(
                  "h-full rounded-[4px] transition-colors",
                  status === "REJECTED"
                    ? "bg-neutral-200"
                    : done
                      ? isCurrent
                        ? "bg-primary-600"
                        : "bg-primary-400"
                      : "bg-neutral-200"
                )}
              />
              <ChartTooltip>{LEAD_STATUS_LABELS[stage]}</ChartTooltip>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 text-[12px]">
        <span className="truncate font-medium text-text-primary">
          {offPath ? LEAD_STATUS_LABELS[status] : `Шаг ${current + 1} из ${STAGE_FLOW.length}: ${LEAD_STATUS_LABELS[status]}`}
        </span>
        <span className="hidden shrink-0 text-text-tertiary sm:inline">{LEAD_STATUS_LABELS.DEAL}</span>
      </div>
    </div>
  );
}
