import { ChartTooltip } from "@/components/ui/chart-tooltip";

interface BarListItem {
  label: string;
  value: number;
  sublabel?: string;
}

/**
 * Рейтинг: одна серия, длина полосы = величина. Значение подписано у конца
 * каждой полосы, поэтому ось и сетка не нужны.
 */
export function BarList({
  items,
  formatValue,
  emptyLabel = "Нет данных за период",
  showShare,
}: {
  items: BarListItem[];
  formatValue?: (value: number) => string;
  emptyLabel?: string;
  /** Показать долю от общей суммы. */
  showShare?: boolean;
}) {
  if (items.length === 0) {
    return <p className="text-[13px] text-text-tertiary">{emptyLabel}</p>;
  }

  const max = Math.max(...items.map((i) => i.value), 1);
  const total = items.reduce((sum, i) => sum + i.value, 0);

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const pct = item.value === 0 ? 0 : Math.max((item.value / max) * 100, 2);
        const share = total > 0 ? Math.round((item.value / total) * 100) : 0;
        return (
          <div key={item.label} className="group relative">
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="truncate text-[13px] text-text-secondary">
                {item.label}
                {item.sublabel && <span className="ml-1.5 text-text-tertiary">{item.sublabel}</span>}
              </span>
              <span className="shrink-0 text-[13px] font-semibold text-text-primary tabular-nums">
                {formatValue ? formatValue(item.value) : item.value}
                {showShare && <span className="ml-1.5 font-normal text-text-tertiary">{share}%</span>}
              </span>
            </div>
            <div className="h-2 w-full rounded-[4px] bg-neutral-100">
              <div
                className="h-full rounded-r-[4px] bg-primary-500 transition-[width]"
                style={{ width: `${pct}%` }}
              />
            </div>
            <ChartTooltip align="start">
              {item.label}: {formatValue ? formatValue(item.value) : item.value}
              {total > 0 ? ` · ${share}% от всех` : ""}
            </ChartTooltip>
          </div>
        );
      })}
    </div>
  );
}
