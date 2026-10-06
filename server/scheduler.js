// 全自動排程：依艾賓浩斯遺忘曲線安排新知學習與週期性複習
import { addDays } from "./dateUtils.js";

const REVIEW_OFFSETS_DAYS = [1, 3, 7, 15];

function toDateList(startDate, endDate) {
  const list = [];
  let cur = startDate;
  while (cur <= endDate) {
    list.push(cur);
    cur = addDays(cur, 1);
  }
  return list;
}

export function generateAutoSchedule({ knowledgePoints, startDate, deadlineDate, dailyMinutes }) {
  const days = toDateList(startDate, deadlineDate);
  if (days.length === 0) return [];

  const tasks = [];
  const minutesUsed = {};
  for (const d of days) minutesUsed[d] = 0;

  function tryAdd(date, task) {
    if (!minutesUsed.hasOwnProperty(date)) return false;
    if (minutesUsed[date] + task.minutes > dailyMinutes) return false;
    minutesUsed[date] += task.minutes;
    tasks.push({ ...task, date });
    return true;
  }

  // 1) 把新知學習任務平均分配到前 70% 的天數
  const learnDays = days.slice(0, Math.max(1, Math.ceil(days.length * 0.7)));
  let dayIndex = 0;
  for (const kp of knowledgePoints) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < learnDays.length) {
      const date = learnDays[dayIndex % learnDays.length];
      placed = tryAdd(date, {
        type: "new",
        title: `新知學習：${kp.title}`,
        knowledgePointId: kp.id,
        minutes: kp.estMinutes || 30,
        source: "ai",
        subject: kp.subject || "未分類",
      });
      dayIndex++;
      attempts++;
    }
    if (placed) {
      // 2) 依艾賓浩斯曲線排入複習任務
      for (const offset of REVIEW_OFFSETS_DAYS) {
        const reviewDate = addDays(learnDays[(dayIndex - 1) % learnDays.length], offset);
        if (reviewDate <= deadlineDate) {
          tryAdd(reviewDate, {
            type: "review",
            title: `複習：${kp.title}`,
            knowledgePointId: kp.id,
            minutes: Math.max(15, Math.round((kp.estMinutes || 30) * 0.5)),
            source: "ai",
            subject: kp.subject || "未分類",
          });
        }
      }
    }
  }

  // 3) 每 3 天安排一次小測，每週安排一次週測
  for (let i = 0; i < days.length; i++) {
    if (i > 0 && i % 3 === 0) {
      tryAdd(days[i], { type: "test", title: "階段小測", knowledgePointId: null, minutes: 20, source: "ai", subject: "測驗" });
    }
    if (i > 0 && i % 7 === 0) {
      tryAdd(days[i], { type: "test", title: "週測驗", knowledgePointId: null, minutes: 40, source: "ai", subject: "測驗" });
    }
  }

  return tasks;
}
