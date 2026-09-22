interface Segment {
  key: string;
  label: string;
  value: number;
  barClass: string;
  dotClass: string;
}

export function StageDistributionBar({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return <p className="text-[13px] text-text-tertiary">Нет лидов за период</p>;
  }

  return (
    <div>
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full">
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <div
              key={s.key}
              className={`h-full ${s.barClass} first:rounded-l-full last:rounded-r-full`}
              style={{ width: `${(s.value / total) * 100}%` }}
              title={`${s.label}: ${s.value}`}
            />
          ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-2 text-[13px]">
            <span className={`h-2 w-2 shrink-0 rounded-full ${s.dotClass}`} />
            <span className="truncate text-text-secondary">{s.label}</span>
            <span className="ml-auto shrink-0 font-medium tabular-nums text-text-primary">
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
