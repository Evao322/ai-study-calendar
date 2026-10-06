import express from "express";
import { nanoid } from "nanoid";
import { db } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { computeStressLevel, hasRecentHighStressStreak } from "../stress.js";
import { todayLocalStr, addDays } from "../dateUtils.js";

export const teacherRouter = express.Router();
teacherRouter.use(requireAuth, requireRole("teacher"));

function nowIso() {
  return new Date().toISOString();
}

function generateClassCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  } while (db.prepare("SELECT id FROM classes WHERE code = ?").get(code));
  return code;
}

teacherRouter.post("/classes", (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: "請填寫班級名稱" });
  const id = `cls_${nanoid(10)}`;
  const code = generateClassCode();
  db.prepare("INSERT INTO classes (id, teacher_id, name, code, created_at) VALUES (?, ?, ?, ?, ?)").run(
    id,
    req.user.id,
    name,
    code,
    nowIso()
  );
  res.json({ class: { id, name, code } });
});

teacherRouter.get("/classes", (req, res) => {
  const rows = db.prepare("SELECT id, name, code FROM classes WHERE teacher_id = ? ORDER BY created_at DESC").all(req.user.id);
  res.json({ classes: rows });
});

teacherRouter.get("/classes/:classId/overview", (req, res) => {
  const classRow = db.prepare("SELECT * FROM classes WHERE id = ? AND teacher_id = ?").get(req.params.classId, req.user.id);
  if (!classRow) return res.status(404).json({ error: "找不到這個班級" });

  const students = db
    .prepare(
      `SELECT s.id, s.name, s.grade FROM students s
       JOIN student_classes sc ON sc.student_id = s.id
       WHERE sc.class_id = ?`
    )
    .all(classRow.id);

  const today = todayLocalStr();
  const sevenDaysAgo = addDays(today, -7);

  const overview = students.map((s) => {
    const taskStats = db
      .prepare(
        `SELECT COUNT(*) as total, SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as done
         FROM tasks WHERE student_id = ? AND date BETWEEN ? AND ?`
      )
      .get(s.id, sevenDaysAgo, today);
    const completionRate = taskStats.total > 0 ? Math.round((taskStats.done / taskStats.total) * 100) : null;
    const stress = computeStressLevel(s.id);
    const needsAttention = hasRecentHighStressStreak(s.id);
    return {
      id: s.id,
      name: s.name,
      grade: s.grade,
      completionRate,
      stressLevel: stress.level,
      needsAttention,
    };
  });

  res.json({ class: { id: classRow.id, name: classRow.name, code: classRow.code }, students: overview });
});

teacherRouter.get("/students/:studentId", (req, res) => {
  const student = db.prepare("SELECT id, name, grade FROM students WHERE id = ?").get(req.params.studentId);
  if (!student) return res.status(404).json({ error: "找不到這位學生" });

  const belongs = db
    .prepare(
      `SELECT 1 FROM student_classes sc JOIN classes c ON c.id = sc.class_id
       WHERE sc.student_id = ? AND c.teacher_id = ?`
    )
    .get(student.id, req.user.id);
  if (!belongs) return res.status(403).json({ error: "這位學生不在您的班級裡" });

  const tasks = db.prepare("SELECT * FROM tasks WHERE student_id = ? ORDER BY date ASC").all(student.id);
  const weakPoints = db
    .prepare(
      `SELECT kp.title as title, COUNT(*) as wrongCount
       FROM quiz_attempts qa
       JOIN questions q ON q.id = qa.question_id
       JOIN knowledge_points kp ON kp.id = q.knowledge_point_id
       WHERE qa.student_id = ? AND qa.is_correct = 0
       GROUP BY kp.title ORDER BY wrongCount DESC LIMIT 10`
    )
    .all(student.id);
  const stress = computeStressLevel(student.id);

  res.json({
    student,
    tasks: tasks.map((t) => ({ date: t.date, type: t.type, title: t.title, status: t.status, minutes: t.minutes })),
    weakPoints,
    stress,
  });
});
