interface BarListItem {
  label: string;
  value: number;
  sublabel?: string;
}

export function BarList({
  items,
  formatValue,
  emptyLabel = "Нет данных за период",
}: {
  items: BarListItem[];
  formatValue?: (value: number) => string;
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return <p className="text-[13px] text-text-tertiary">{emptyLabel}</p>;
  }

  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const pct = item.value === 0 ? 0 : Math.max((item.value / max) * 100, 3);
        return (
          <div key={item.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="truncate text-[13px] text-text-secondary">
                {item.label}
                {item.sublabel && <span className="ml-1.5 text-text-tertiary">{item.sublabel}</span>}
              </span>
              <span className="shrink-0 text-[13px] font-semibold tabular-nums text-text-primary">
                {formatValue ? formatValue(item.value) : item.value}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary-50">
              <div
                className="h-full rounded-full bg-primary-500 transition-[width]"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
