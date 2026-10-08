// 前端日曆用的本地日期工具（依使用者瀏覽器的本地時區顯示月曆，與後端的 UTC 字串運算分開）

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

import type { Lang } from "./i18n";

const MONTH_NAMES_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function monthLabel(d: Date, lang: Lang = "zh"): string {
  if (lang === "en") return `${MONTH_NAMES_EN[d.getMonth()]} ${d.getFullYear()}`;
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

const WEEKDAY_LABELS_ZH = ["日", "一", "二", "三", "四", "五", "六"];
const WEEKDAY_LABELS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function weekdayLabels(lang: Lang = "zh"): string[] {
  return lang === "en" ? WEEKDAY_LABELS_EN : WEEKDAY_LABELS_ZH;
}

export function buildMonthGrid(monthDate: Date): Date[] {
  const first = startOfMonth(monthDate);
  const gridStart = addDaysLocal(first, -first.getDay());
  return Array.from({ length: 42 }, (_, i) => addDaysLocal(gridStart, i));
}

export function formatSelectedDate(key: string, lang: Lang = "zh"): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (lang === "en") {
    return `${MONTH_NAMES_EN[m - 1]} ${d}, ${y} (${WEEKDAY_LABELS_EN[date.getDay()]})`;
  }
  return `${m}月${d}日 星期${WEEKDAY_LABELS_ZH[date.getDay()]}`;
}
