// Local date utilities for the calendar UI (renders in the browser's local
// timezone, kept separate from the backend's UTC date-string arithmetic).
import type { Lang } from "./i18n";

export function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return toKey(new Date());
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

export function addDaysLocal(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta);
}

export function monthLabel(d: Date, lang: Lang): string {
  if (lang === "en") {
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

const WEEKDAY_LABELS_BY_LANG: Record<Lang, string[]> = {
  zh: ["日", "一", "二", "三", "四", "五", "六"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

export function weekdayLabels(lang: Lang): string[] {
  return WEEKDAY_LABELS_BY_LANG[lang];
}

export function buildMonthGrid(monthDate: Date): Date[] {
  const first = startOfMonth(monthDate);
  const gridStart = addDaysLocal(first, -first.getDay());
  return Array.from({ length: 42 }, (_, i) => addDaysLocal(gridStart, i));
}

export function formatSelectedDate(key: string, lang: Lang): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (lang === "en") {
    const dateLabel = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `${dateLabel} (${WEEKDAY_LABELS_BY_LANG.en[date.getDay()]})`;
  }
  return `${m}月${d}日 星期${WEEKDAY_LABELS_BY_LANG.zh[date.getDay()]}`;
}
