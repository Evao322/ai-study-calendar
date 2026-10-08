import express from "express";
import { nanoid } from "nanoid";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { reviewManualPlan } from "../gemini.js";
import { generateAutoSchedule } from "../scheduler.js";
import { computeStressLevel, logStress } from "../stress.js";
import { todayLocalStr } from "../dateUtils.js";

export const calendarRouter = express.Router();
calendarRouter.use(requireAuth);

function nowIso() {
  return new Date().toISOString();
}

calendarRouter.get("/tasks", (req, res) => {
  const { from, to } = req.query;
  let rows;
  if (from && to) {
    rows = db
      .prepare("SELECT * FROM tasks WHERE student_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC")
      .all(req.user.id, from, to);
  } else {
    rows = db.prepare("SELECT * FROM tasks WHERE student_id = ? ORDER BY date ASC").all(req.user.id);
  }
  res.json({ tasks: rows.map(toTaskDto) });
});

function toTaskDto(r) {
  return {
    id: r.id,
    date: r.date,
    type: r.type,
    title: r.title,
    knowledgePointId: r.knowledge_point_id,
    status: r.status,
    source: r.source,
    minutes: r.minutes,
    subject: r.subject || "未分類",
    time: r.time || null,
  };
}

calendarRouter.post("/tasks", (req, res) => {
  const { date, type, title, minutes, knowledgePointId, subject, time } = req.body || {};
  if (!date || !title) return res.status(400).json({ error: "請填寫日期與任務名稱" });
  const id = `task_${nanoid(10)}`;
  db.prepare(
    "INSERT INTO tasks (id, student_id, date, type, title, knowledge_point_id, status, source, minutes, subject, time, created_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', 'manual', ?, ?, ?, ?)"
  ).run(id, req.user.id, date, type || "custom", title, knowledgePointId || null, minutes || 30, subject || "未分類", time || null, nowIso());
  res.json({
    task: toTaskDto({
      id,
      date,
      type: type || "custom",
      title,
      knowledge_point_id: knowledgePointId,
      status: "pending",
      source: "manual",
      minutes: minutes || 30,
      subject: subject || "未分類",
      time: time || null,
    }),
  });
});

calendarRouter.patch("/tasks/:id", (req, res) => {
  const { status, date, title, minutes, subject, time } = req.body || {};
  const row = db.prepare("SELECT * FROM tasks WHERE id = ? AND student_id = ?").get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: "找不到這個任務" });

  db.prepare(
    "UPDATE tasks SET status = ?, date = ?, title = ?, minutes = ?, subject = ?, time = ? WHERE id = ?"
  ).run(
    status ?? row.status,
    date ?? row.date,
    title ?? row.title,
    minutes ?? row.minutes,
    subject ?? row.subject,
    time ?? row.time,
    row.id
  );

  if (status === "done") {
    const { level, reason } = computeStressLevel(req.user.id);
    logStress(req.user.id, level, reason);
  }
  res.json({ ok: true });
});

calendarRouter.delete("/tasks/:id", (req, res) => {
  db.prepare("DELETE FROM tasks WHERE id = ? AND student_id = ?").run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// AI 審核最佳化：針對目前的手動任務給建議
calendarRouter.post("/review", async (req, res) => {
  const { deadlineDate } = req.body || {};
  const rows = db.prepare("SELECT date, type, title, minutes FROM tasks WHERE student_id = ?").all(req.user.id);
  const lang = req.headers["x-app-lang"] === "en" ? "en" : "zh";
  const suggestions = await reviewManualPlan(rows, deadlineDate || "", lang);
  res.json({ suggestions });
});

// AI 全自動排程：依知識點、每日可用時間、截止日自動產生任務
calendarRouter.post("/auto-generate", (req, res) => {
  const { deadlineDate, dailyMinutes } = req.body || {};
  if (!deadlineDate || !dailyMinutes) return res.status(400).json({ error: "請填寫截止日期與每日可用時間" });

  const knowledgePoints = db
    .prepare("SELECT id, title, est_minutes as estMinutes, subject FROM knowledge_points WHERE student_id = ? ORDER BY order_index ASC")
    .all(req.user.id);
  if (knowledgePoints.length === 0) {
    return res.status(400).json({ error: "請先上傳學習文件，才能自動排程" });
  }

  const startDate = todayLocalStr();
  const generated = generateAutoSchedule({ knowledgePoints, startDate, deadlineDate, dailyMinutes });

  const insert = db.prepare(
    "INSERT INTO tasks (id, student_id, date, type, title, knowledge_point_id, status, source, minutes, subject, created_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', 'ai', ?, ?, ?)"
  );
  const saved = generated.map((t) => {
    const id = `task_${nanoid(10)}`;
    insert.run(id, req.user.id, t.date, t.type, t.title, t.knowledgePointId, t.minutes, t.subject || "未分類", nowIso());
    return toTaskDto({
      id,
      date: t.date,
      type: t.type,
      title: t.title,
      knowledge_point_id: t.knowledgePointId,
      status: "pending",
      source: "ai",
      minutes: t.minutes,
      subject: t.subject,
    });
  });

  res.json({ tasks: saved });
});

calendarRouter.get("/stress", (req, res) => {
  const result = computeStressLevel(req.user.id);
  res.json(result);
});
