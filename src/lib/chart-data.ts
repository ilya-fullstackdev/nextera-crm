import { eachDayOfInterval, eachMonthOfInterval, format, startOfDay, startOfMonth, subDays, subMonths } from "date-fns";
import { ru } from "date-fns/locale";
import type { ActivityPoint } from "@/components/ui/activity-chart";

/** Раскладывает даты по дням за последние `days` дней (включая сегодня). */
export function bucketByDay(dates: Date[], days = 14): ActivityPoint[] {
  const end = startOfDay(new Date());
  const start = subDays(end, days - 1);

  const counts = new Map<string, number>();
  for (const d of dates) {
    const key = format(startOfDay(d), "yyyy-MM-dd");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return eachDayOfInterval({ start, end }).map((day) => {
    const key = format(day, "yyyy-MM-dd");
    return { date: key, label: format(day, "dd.MM"), value: counts.get(key) ?? 0 };
  });
}

/** Раскладывает даты по месяцам за последние `months` месяцев. */
export function bucketByMonth(dates: Date[], months = 6): ActivityPoint[] {
  const end = startOfMonth(new Date());
  const start = subMonths(end, months - 1);

  const counts = new Map<string, number>();
  for (const d of dates) {
    const key = format(startOfMonth(d), "yyyy-MM");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return eachMonthOfInterval({ start, end }).map((month) => {
    const key = format(month, "yyyy-MM");
    return { date: key, label: format(month, "LLL", { locale: ru }), value: counts.get(key) ?? 0 };
  });
}
