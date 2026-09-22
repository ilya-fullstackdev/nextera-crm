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
