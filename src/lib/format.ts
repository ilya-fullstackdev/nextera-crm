import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { ru } from "date-fns/locale";

export function formatDate(date: string | Date) {
  return format(new Date(date), "d MMMM yyyy", { locale: ru });
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), "d MMMM, HH:mm", { locale: ru });
}

export function formatShortDate(date: string | Date) {
  return format(new Date(date), "dd.MM.yyyy", { locale: ru });
}

export function formatRelativeDay(date: string | Date) {
  const d = new Date(date);
  if (isToday(d)) return `Сегодня, ${format(d, "HH:mm")}`;
  if (isYesterday(d)) return `Вчера, ${format(d, "HH:mm")}`;
  return format(d, "d MMMM, HH:mm", { locale: ru });
}

export function formatTimeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { locale: ru, addSuffix: true });
}

/** Русское склонение: plural(1, ["выплата", "выплаты", "выплат"]) → «выплата». */
export function plural(count: number, forms: [string, string, string]) {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return forms[2];
  if (n1 > 1 && n1 < 5) return forms[1];
  if (n1 === 1) return forms[0];
  return forms[2];
}
