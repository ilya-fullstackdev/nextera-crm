import { ChartTooltip } from "@/components/ui/chart-tooltip";

export interface ActivityPoint {
  /** ISO-дата дня. */
  date: string;
  /** Подпись под столбцом, например «14.03». */
  label: string;
  value: number;
}

/**
 * Активность по дням: столбики одной серии, поэтому легенда не нужна —
 * заголовок карточки говорит, что именно отложено по вертикали.
 */
export function ActivityChart({
  points,
  emptyLabel = "Пока нет активности",
  valueLabel = "действий",
}: {
  points: ActivityPoint[];
  emptyLabel?: string;
  valueLabel?: string;
}) {
  const max = Math.max(...points.map((p) => p.value), 1);
  const total = points.reduce((sum, p) => sum + p.value, 0);

  if (total === 0) {
    return <p className="text-[13px] text-text-tertiary">{emptyLabel}</p>;
  }

  return (
    <div>
      <div className="flex h-28 items-end gap-[2px]">
        {points.map((p) => {
          const height = (p.value / max) * 100;
          return (
            <div key={p.date} className="group relative flex h-full flex-1 items-end">
              <div
                className="w-full max-w-6 rounded-t-[4px] bg-primary-500 transition-colors group-hover:bg-primary-600"
                style={{ height: `${p.value === 0 ? 2 : Math.max(height, 4)}%` }}
              />
              <ChartTooltip>
                {p.label}: {p.value} {valueLabel}
              </ChartTooltip>
            </div>
          );
        })}
      </div>

      {/* Подписи только по краям и в середине — иначе ось превращается в шум. */}
      <div className="mt-2 flex items-center justify-between text-[11px] text-text-tertiary tabular-nums">
        <span>{points[0]?.label}</span>
        <span>{points[Math.floor(points.length / 2)]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}
