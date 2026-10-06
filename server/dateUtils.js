// 日期工具：所有「YYYY-MM-DD」字串一律用 UTC 運算，避免因主機時區（例如港澳 UTC+8）
// 造成 toISOString() 轉換時少一天、甚至讓迴圈的日期永遠不會往前推進。

export function todayLocalStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}
