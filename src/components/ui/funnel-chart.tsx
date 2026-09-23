import { ChartTooltip } from "@/components/ui/chart-tooltip";

export interface FunnelStep {
  key: string;
  label: string;
  value: number;
}

/**
 * Воронка: один показатель на всех этапах, поэтому один цвет — длину полосы
 * читает величина, а не оттенок. Рядом с каждым шагом показываем конверсию
 * из предыдущего, чтобы было видно, где отваливаются лиды.
 */
export function FunnelChart({ steps }: { steps: FunnelStep[] }) {
  const base = steps[0]?.value ?? 0;

  if (base === 0) {
    return <p className="text-[13px] text-text-tertiary">Нет лидов за период</p>;
  }

  return (
    <div className="space-y-2.5">
      {steps.map((step, i) => {
        const prev = i === 0 ? null : steps[i - 1].value;
        const width = (step.value / base) * 100;
        const fromPrev = prev && prev > 0 ? Math.round((step.value / prev) * 100) : null;
        const fromStart = Math.round((step.value / base) * 100);

        return (
          <div key={step.key} className="group relative">
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="truncate text-[13px] text-text-secondary">{step.label}</span>
              <span className="shrink-0 text-[13px] text-text-tertiary tabular-nums">
                {i === 0 ? "100% базы" : `${fromStart}% базы`}
                {fromPrev !== null && (
                  <span className="ml-2 hidden text-text-secondary sm:inline">→ {fromPrev}% с шага</span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-6 flex-1 rounded-[4px] bg-neutral-100">
                <div
                  className="h-full rounded-r-[4px] bg-primary-600"
                  style={{ width: `${step.value === 0 ? 0 : Math.max(width, 1.5)}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-[13px] font-semibold text-text-primary tabular-nums sm:w-12">
                {step.value}
              </span>
            </div>

            <ChartTooltip align="start">
              {step.label}: {step.value}
              {fromPrev !== null ? ` · ${fromPrev}% с предыдущего шага` : ""}
            </ChartTooltip>
          </div>
        );
      })}
    </div>
  );
}
