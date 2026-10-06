import { addDays, todayLocalStr } from "./dateUtils";
import { newId } from "./auth";

type TaskRow = { date: string; status: string; minutes: number };

export async function computeStressLevel(db: D1Database, studentId: string) {
  const today = todayLocalStr();
  const start = addDays(today, -2);
  const { results } = await db
    .prepare(`SELECT date, status, minutes FROM tasks WHERE student_id = ? AND date BETWEEN ? AND ?`)
    .bind(studentId, start, today)
    .all<TaskRow>();
  const rows = results || [];

  const byDate: Record<string, { total: number; done: number; minutes: number }> = {};
  for (const r of rows) {
    byDate[r.date] = byDate[r.date] || { total: 0, done: 0, minutes: 0 };
    byDate[r.date].total += 1;
    byDate[r.date].minutes += r.minutes || 0;
    if (r.status === "done") byDate[r.date].done += 1;
  }

  const dates = Object.keys(byDate);
  const overloadDays = dates.filter((d) => byDate[d].minutes > 240).length;
  const pastDates = dates.filter((d) => d < today);
  const totalTasks = pastDates.reduce((s, d) => s + byDate[d].total, 0);
  const doneTasks = pastDates.reduce((s, d) => s + byDate[d].done, 0);
  const completionRate = totalTasks > 0 ? doneTasks / totalTasks : 1;

  let level = "正常";
  let reason = "學習節奏正常。";
  if (overloadDays >= 2 || completionRate < 0.4) {
    level = "過載";
    reason = overloadDays >= 2 ? "連續多天單日學習時間過長。" : "最近完成率偏低，可能進度跟不上。";
  } else if (overloadDays >= 1 || completionRate < 0.6) {
    level = "偏高";
    reason = overloadDays >= 1 ? "有一天學習時間偏長。" : "完成率稍低，建議留意。";
  } else {
    const todayMinutes = byDate[today]?.minutes || 0;
    if (todayMinutes > 0 && todayMinutes < 60) {
      level = "輕鬆";
      reason = "今天的學習安排較輕鬆。";
    }
  }

  return { level, reason, completionRate: Math.round(completionRate * 100), overloadDays };
}

export async function logStress(db: D1Database, studentId: string, level: string, reason: string) {
  const id = newId("st");
  await db
    .prepare(`INSERT INTO stress_logs (id, student_id, date, level, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(id, studentId, todayLocalStr(), level, reason, new Date().toISOString())
    .run();
}

export async function hasRecentHighStressStreak(db: D1Database, studentId: string): Promise<boolean> {
  const { results } = await db
    .prepare(`SELECT date, level FROM stress_logs WHERE student_id = ? ORDER BY date DESC LIMIT 3`)
    .bind(studentId)
    .all<{ date: string; level: string }>();
  const rows = results || [];
  const highDays = rows.filter((r) => r.level === "偏高" || r.level === "過載").length;
  return highDays >= 2;
}
