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

export function monthLabel(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];
export { WEEKDAY_LABELS };

export function buildMonthGrid(monthDate: Date): Date[] {
  const first = startOfMonth(monthDate);
  const gridStart = addDaysLocal(first, -first.getDay());
  return Array.from({ length: 42 }, (_, i) => addDaysLocal(gridStart, i));
}

export function formatSelectedDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${m}月${d}日 星期${WEEKDAY_LABELS[date.getDay()]}`;
}
