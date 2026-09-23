import { ChartTooltip } from "@/components/ui/chart-tooltip";

interface Segment {
  key: string;
  label: string;
  value: number;
  barClass: string;
  dotClass: string;
}

/**
 * Сколько лидов на каждом этапе. Сегменты разделены зазором в 2px цветом
 * подложки — соседние цвета читаются раздельно без обводок. Легенда с числами
 * обязательна: она несёт смысл, если цвета неразличимы.
 */
export function StageDistributionBar({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return <p className="text-[13px] text-text-tertiary">Нет лидов за период</p>;
  }

  return (
    <div>
      <div className="flex h-3.5 w-full gap-[2px]">
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <div key={s.key} className="group relative h-full" style={{ width: `${(s.value / total) * 100}%` }}>
              <div className={`h-full rounded-[4px] ${s.barClass}`} />
              <ChartTooltip>
                {s.label}: {s.value} ({Math.round((s.value / total) * 100)}%)
              </ChartTooltip>
            </div>
          ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-2 text-[13px]">
            <span className={`h-2 w-2 shrink-0 rounded-full ${s.dotClass}`} />
            <span className="truncate text-text-secondary">{s.label}</span>
            <span className="ml-auto shrink-0 font-medium text-text-primary tabular-nums">
              {s.value}
              <span className="ml-1 text-text-tertiary">
                ({total > 0 ? Math.round((s.value / total) * 100) : 0}%)
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
