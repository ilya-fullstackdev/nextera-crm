"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

const PERIODS = [
  { value: "today", label: "Сегодня" },
  { value: "week", label: "Неделя" },
  { value: "month", label: "Месяц" },
  { value: "custom", label: "Произвольный период" },
];

export function PeriodPicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const period = searchParams.get("period") ?? "month";

  function setPeriod(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  function setDate(key: "from" | "to", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", "custom");
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => setPeriod(p.value)}
          className={cn(
            "h-8 rounded-md border px-3 text-[13px] font-medium transition-colors",
            period === p.value
              ? "border-primary-500 bg-primary-50 text-primary-700"
              : "border-border-default bg-white text-text-secondary hover:bg-surface-hover"
          )}
        >
          {p.label}
        </button>
      ))}
      {period === "custom" && (
        <div className="flex items-center gap-2">
          <DatePicker
            className="!h-8"
            value={searchParams.get("from") ?? ""}
            onChange={(e) => setDate("from", e.target.value)}
          />
          <span className="text-text-tertiary">—</span>
          <DatePicker
            className="!h-8"
            value={searchParams.get("to") ?? ""}
            onChange={(e) => setDate("to", e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
