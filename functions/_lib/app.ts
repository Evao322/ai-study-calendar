import { Hono } from "hono";
import bcrypt from "bcryptjs";
import type { Env, AuthVars } from "./types";
import { signToken, verifyToken, newId } from "./auth";
import { todayLocalStr, addDays } from "./dateUtils";
import { generateAutoSchedule } from "./scheduler";
import { computeStressLevel, logStress, hasRecentHighStressStreak } from "./stress";
import { parseDocumentToKnowledgePoints, reviewManualPlan, generateQuestions, gradeAnswer } from "./gemini";

const app = new Hono<{ Bindings: Env; Variables: AuthVars }>();

function nowIso() {
  return new Date().toISOString();
}

function jwtSecret(env: Env) {
  return env.JWT_SECRET || "dev-local-secret-change-later";
}

async function requireAuth(c: any, next: () => Promise<void>) {
  const header = c.req.header("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return c.json({ error: "請先登入" }, 401);
  try {
    const payload = await verifyToken(token, jwtSecret(c.env));
    c.set("user", payload);
    await next();
  } catch {
    return c.json({ error: "登入已過期，請重新登入" }, 401);
  }
}

function requireRole(role: "teacher" | "student") {
  return async (c: any, next: () => Promise<void>) => {
    const user = c.get("user");
    if (user?.role !== role) return c.json({ error: "沒有權限" }, 403);
    await next();
  };
}

app.get("/api/health", (c) => c.json({ status: "ok" }));

// ---------------- auth ----------------
app.post("/api/auth/register-teacher", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { username, name, password } = body || {};
  if (!username || !name || !password) return c.json({ error: "請填寫帳號、姓名、密碼" }, 400);
  const exists = await c.env.DB.prepare("SELECT id FROM teachers WHERE username = ?").bind(username).first();
  if (exists) return c.json({ error: "這個帳號已經被使用了" }, 400);

  const id = newId("t");
  const hash = bcrypt.hashSync(password, 10);
  await c.env.DB.prepare("INSERT INTO teachers (id, username, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(id, username, name, hash, nowIso())
    .run();

  const token = await signToken({ id, role: "teacher", name }, jwtSecret(c.env));
  return c.json({ token, user: { id, role: "teacher", name } });
});

app.post("/api/auth/login-teacher", async (c) => {
  const { username, password } = (await c.req.json().catch(() => ({}))) || {};
  const row = await c.env.DB.prepare("SELECT * FROM teachers WHERE username = ?").bind(username).first<any>();
  if (!row || !bcrypt.compareSync(password || "", row.password_hash)) return c.json({ error: "帳號或密碼不正確" }, 401);
  const token = await signToken({ id: row.id, role: "teacher", name: row.name }, jwtSecret(c.env));
  return c.json({ token, user: { id: row.id, role: "teacher", name: row.name } });
});

app.post("/api/auth/register-student", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { username, name, grade, password, classCode } = body || {};
  if (!username || !name || !password) return c.json({ error: "請填寫帳號、姓名、密碼" }, 400);
  const exists = await c.env.DB.prepare("SELECT id FROM students WHERE username = ?").bind(username).first();
  if (exists) return c.json({ error: "這個帳號已經被使用了" }, 400);

  let classRow: any = null;
  if (classCode) {
    classRow = await c.env.DB.prepare("SELECT * FROM classes WHERE code = ?").bind(String(classCode).trim().toUpperCase()).first();
    if (!classRow) return c.json({ error: "班級碼不正確，請跟老師確認" }, 400);
  }

  const id = newId("s");
  const hash = bcrypt.hashSync(password, 10);
  await c.env.DB.prepare("INSERT INTO students (id, username, name, grade, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(id, username, name, grade || "", hash, nowIso())
    .run();

  if (classRow) {
    await c.env.DB.prepare("INSERT OR IGNORE INTO student_classes (student_id, class_id) VALUES (?, ?)").bind(id, classRow.id).run();
  }

  const token = await signToken({ id, role: "student", name }, jwtSecret(c.env));
  return c.json({ token, user: { id, role: "student", name, grade: grade || "" } });
});

app.post("/api/auth/login-student", async (c) => {
  const { username, password } = (await c.req.json().catch(() => ({}))) || {};
  const row = await c.env.DB.prepare("SELECT * FROM students WHERE username = ?").bind(username).first<any>();
  if (!row || !bcrypt.compareSync(password || "", row.password_hash)) return c.json({ error: "帳號或密碼不正確" }, 401);
  const token = await signToken({ id: row.id, role: "student", name: row.name }, jwtSecret(c.env));
  return c.json({ token, user: { id: row.id, role: "student", name: row.name, grade: row.grade } });
});

app.post("/api/auth/join-class", async (c) => {
  const { studentId, classCode } = (await c.req.json().catch(() => ({}))) || {};
  const classRow = await c.env.DB.prepare("SELECT * FROM classes WHERE code = ?").bind(String(classCode || "").trim().toUpperCase()).first<any>();
  if (!classRow) return c.json({ error: "班級碼不正確" }, 400);
  await c.env.DB.prepare("INSERT OR IGNORE INTO student_classes (student_id, class_id) VALUES (?, ?)").bind(studentId, classRow.id).run();
  return c.json({ ok: true, className: classRow.name });
});

// ---------------- documents ----------------
app.post("/api/documents/upload", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const subject = (body?.subject || "未分類").trim().slice(0, 20) || "未分類";
  const rawText: string = body?.text || "";
  if (!rawText || rawText.trim().length < 10) return c.json({ error: "文件內容太短，請確認貼上的文字" }, 400);

  const docId = newId("doc");
  await c.env.DB.prepare("INSERT INTO documents (id, student_id, filename, raw_text, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(docId, user.id, "手動貼上的文字", rawText, nowIso())
    .run();

  const knowledgePoints = await parseDocumentToKnowledgePoints(rawText, c.env.GEMINI_API_KEY);

  const saved = [];
  let i = 0;
  for (const kp of knowledgePoints) {
    const id = newId("kp");
    await c.env.DB.prepare(
      "INSERT INTO knowledge_points (id, document_id, student_id, title, level, est_minutes, order_index, subject) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(id, docId, user.id, kp.title, kp.level, kp.estMinutes, i, subject)
      .run();
    saved.push({ id, documentId: docId, subject, ...kp });
    i++;
  }

  return c.json({ documentId: docId, knowledgePoints: saved });
});

app.get("/api/documents/knowledge-points", requireAuth, async (c) => {
  const user = c.get("user");
  const { results } = await c.env.DB.prepare("SELECT * FROM knowledge_points WHERE student_id = ? ORDER BY order_index ASC").bind(user.id).all<any>();
  return c.json({
    knowledgePoints: (results || []).map((r) => ({
      id: r.id,
      documentId: r.document_id,
      title: r.title,
      level: r.level,
      estMinutes: r.est_minutes,
      subject: r.subject || "未分類",
    })),
  });
});

// ---------------- calendar ----------------
function toTaskDto(r: any) {
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

app.get("/api/calendar/tasks", requireAuth, async (c) => {
  const user = c.get("user");
  const from = c.req.query("from");
  const to = c.req.query("to");
  let results: any[] = [];
  if (from && to) {
    const r = await c.env.DB.prepare("SELECT * FROM tasks WHERE student_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC").bind(user.id, from, to).all<any>();
    results = r.results || [];
  } else {
    const r = await c.env.DB.prepare("SELECT * FROM tasks WHERE student_id = ? ORDER BY date ASC").bind(user.id).all<any>();
    results = r.results || [];
  }
  return c.json({ tasks: results.map(toTaskDto) });
});

app.post("/api/calendar/tasks", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const { date, type, title, minutes, knowledgePointId, subject, time } = body || {};
  if (!date || !title) return c.json({ error: "請填寫日期與任務名稱" }, 400);
  const id = newId("task");
  await c.env.DB.prepare(
    "INSERT INTO tasks (id, student_id, date, type, title, knowledge_point_id, status, source, minutes, subject, time, created_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', 'manual', ?, ?, ?, ?)"
  )
    .bind(id, user.id, date, type || "custom", title, knowledgePointId || null, minutes || 30, subject || "未分類", time || null, nowIso())
    .run();
  return c.json({
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

app.patch("/api/calendar/tasks/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const { status, date, title, minutes, subject, time } = body || {};
  const row = await c.env.DB.prepare("SELECT * FROM tasks WHERE id = ? AND student_id = ?").bind(id, user.id).first<any>();
  if (!row) return c.json({ error: "找不到這個任務" }, 404);

  await c.env.DB.prepare("UPDATE tasks SET status = ?, date = ?, title = ?, minutes = ?, subject = ?, time = ? WHERE id = ?")
    .bind(status ?? row.status, date ?? row.date, title ?? row.title, minutes ?? row.minutes, subject ?? row.subject, time ?? row.time, row.id)
    .run();

  if (status === "done") {
    const { level, reason } = await computeStressLevel(c.env.DB, user.id);
    await logStress(c.env.DB, user.id, level, reason);
  }
  return c.json({ ok: true });
});

app.delete("/api/calendar/tasks/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM tasks WHERE id = ? AND student_id = ?").bind(id, user.id).run();
  return c.json({ ok: true });
});

app.post("/api/calendar/review", requireAuth, async (c) => {
  const user = c.get("user");
  const { deadlineDate } = (await c.req.json().catch(() => ({}))) || {};
  const { results } = await c.env.DB.prepare("SELECT date, type, title, minutes FROM tasks WHERE student_id = ?").bind(user.id).all<any>();
  const suggestions = await reviewManualPlan(results || [], deadlineDate || "", c.env.GEMINI_API_KEY);
  return c.json({ suggestions });
});

app.post("/api/calendar/auto-generate", requireAuth, async (c) => {
  const user = c.get("user");
  const { deadlineDate, dailyMinutes } = (await c.req.json().catch(() => ({}))) || {};
  if (!deadlineDate || !dailyMinutes) return c.json({ error: "請填寫截止日期與每日可用時間" }, 400);

  const { results } = await c.env.DB.prepare(
    "SELECT id, title, est_minutes as estMinutes, subject FROM knowledge_points WHERE student_id = ? ORDER BY order_index ASC"
  )
    .bind(user.id)
    .all<any>();
  const knowledgePoints = results || [];
  if (knowledgePoints.length === 0) return c.json({ error: "請先上傳學習文件，才能自動排程" }, 400);

  const startDate = todayLocalStr();
  const generated = generateAutoSchedule({ knowledgePoints, startDate, deadlineDate, dailyMinutes });

  const saved = [];
  for (const t of generated) {
    const id = newId("task");
    await c.env.DB.prepare(
      "INSERT INTO tasks (id, student_id, date, type, title, knowledge_point_id, status, source, minutes, subject, created_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', 'ai', ?, ?, ?)"
    )
      .bind(id, user.id, t.date, t.type, t.title, t.knowledgePointId, t.minutes, t.subject || "未分類", nowIso())
      .run();
    saved.push(
      toTaskDto({
        id,
        date: t.date,
        type: t.type,
        title: t.title,
        knowledge_point_id: t.knowledgePointId,
        status: "pending",
        source: "ai",
        minutes: t.minutes,
        subject: t.subject,
      })
    );
  }

  return c.json({ tasks: saved });
});

app.get("/api/calendar/stress", requireAuth, async (c) => {
  const user = c.get("user");
  const result = await computeStressLevel(c.env.DB, user.id);
  return c.json(result);
});

// ---------------- quiz ----------------
app.post("/api/quiz/generate", requireAuth, async (c) => {
  const user = c.get("user");
  const { knowledgePointId, difficulty, count } = (await c.req.json().catch(() => ({}))) || {};
  const kp = await c.env.DB.prepare("SELECT * FROM knowledge_points WHERE id = ? AND student_id = ?").bind(knowledgePointId, user.id).first<any>();
  if (!kp) return c.json({ error: "找不到這個知識點" }, 404);

  const questions = await generateQuestions(kp.title, difficulty || "basic", count || 3, c.env.GEMINI_API_KEY);
  const saved = [];
  for (const q of questions) {
    const id = newId("q");
    await c.env.DB.prepare(
      "INSERT INTO questions (id, knowledge_point_id, student_id, difficulty, type, content, options, answer, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(id, kp.id, user.id, difficulty || "basic", q.type, q.content, JSON.stringify(q.options), q.answer, nowIso())
      .run();
    saved.push({ id, type: q.type, content: q.content, options: q.options });
  }

  return c.json({ questions: saved, knowledgePointTitle: kp.title });
});

app.post("/api/quiz/submit", requireAuth, async (c) => {
  const user = c.get("user");
  const { questionId, answer, taskId } = (await c.req.json().catch(() => ({}))) || {};
  const q = await c.env.DB.prepare("SELECT * FROM questions WHERE id = ? AND student_id = ?").bind(questionId, user.id).first<any>();
  if (!q) return c.json({ error: "找不到這個題目" }, 404);

  const question = { type: q.type, content: q.content, answer: q.answer };
  const { isCorrect, feedback } = await gradeAnswer(question, answer, c.env.GEMINI_API_KEY);

  const id = newId("qa");
  await c.env.DB.prepare(
    "INSERT INTO quiz_attempts (id, student_id, question_id, task_id, student_answer, is_correct, feedback, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(id, user.id, q.id, taskId || null, String(answer || ""), isCorrect ? 1 : 0, feedback, nowIso())
    .run();

  return c.json({ isCorrect, feedback, correctAnswer: q.answer });
});

app.get("/api/quiz/weak-points", requireAuth, async (c) => {
  const user = c.get("user");
  const { results } = await c.env.DB.prepare(
    `SELECT kp.title as title, COUNT(*) as wrongCount
     FROM quiz_attempts qa
     JOIN questions q ON q.id = qa.question_id
     JOIN knowledge_points kp ON kp.id = q.knowledge_point_id
     WHERE qa.student_id = ? AND qa.is_correct = 0
     GROUP BY kp.title
     ORDER BY wrongCount DESC
     LIMIT 10`
  )
    .bind(user.id)
    .all<any>();
  return c.json({ weakPoints: results || [] });
});

// ---------------- teacher ----------------
function generateClassCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

app.post("/api/teacher/classes", requireAuth, requireRole("teacher"), async (c) => {
  const user = c.get("user");
  const { name } = (await c.req.json().catch(() => ({}))) || {};
  if (!name) return c.json({ error: "請填寫班級名稱" }, 400);

  let code = generateClassCode();
  for (let attempts = 0; attempts < 5; attempts++) {
    const taken = await c.env.DB.prepare("SELECT id FROM classes WHERE code = ?").bind(code).first();
    if (!taken) break;
    code = generateClassCode();
  }

  const id = newId("cls");
  await c.env.DB.prepare("INSERT INTO classes (id, teacher_id, name, code, created_at) VALUES (?, ?, ?, ?, ?)").bind(id, user.id, name, code, nowIso()).run();
  return c.json({ class: { id, name, code } });
});

app.get("/api/teacher/classes", requireAuth, requireRole("teacher"), async (c) => {
  const user = c.get("user");
  const { results } = await c.env.DB.prepare("SELECT id, name, code FROM classes WHERE teacher_id = ? ORDER BY created_at DESC").bind(user.id).all<any>();
  return c.json({ classes: results || [] });
});

app.get("/api/teacher/classes/:classId/overview", requireAuth, requireRole("teacher"), async (c) => {
  const user = c.get("user");
  const classId = c.req.param("classId");
  const classRow = await c.env.DB.prepare("SELECT * FROM classes WHERE id = ? AND teacher_id = ?").bind(classId, user.id).first<any>();
  if (!classRow) return c.json({ error: "找不到這個班級" }, 404);

  const { results: students } = await c.env.DB.prepare(
    `SELECT s.id, s.name, s.grade FROM students s JOIN student_classes sc ON sc.student_id = s.id WHERE sc.class_id = ?`
  )
    .bind(classRow.id)
    .all<any>();

  const today = todayLocalStr();
  const sevenDaysAgo = addDays(today, -7);

  const overview = [];
  for (const s of students || []) {
    const taskStats = await c.env.DB.prepare(
      `SELECT COUNT(*) as total, SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as done FROM tasks WHERE student_id = ? AND date BETWEEN ? AND ?`
    )
      .bind(s.id, sevenDaysAgo, today)
      .first<any>();
    const completionRate = taskStats?.total > 0 ? Math.round((taskStats.done / taskStats.total) * 100) : null;
    const stress = await computeStressLevel(c.env.DB, s.id);
    const needsAttention = await hasRecentHighStressStreak(c.env.DB, s.id);
    overview.push({ id: s.id, name: s.name, grade: s.grade, completionRate, stressLevel: stress.level, needsAttention });
  }

  return c.json({ class: { id: classRow.id, name: classRow.name, code: classRow.code }, students: overview });
});

app.get("/api/teacher/students/:studentId", requireAuth, requireRole("teacher"), async (c) => {
  const user = c.get("user");
  const studentId = c.req.param("studentId");
  const student = await c.env.DB.prepare("SELECT id, name, grade FROM students WHERE id = ?").bind(studentId).first<any>();
  if (!student) return c.json({ error: "找不到這位學生" }, 404);

  const belongs = await c.env.DB.prepare(
    `SELECT 1 as x FROM student_classes sc JOIN classes cl ON cl.id = sc.class_id WHERE sc.student_id = ? AND cl.teacher_id = ?`
  )
    .bind(student.id, user.id)
    .first();
  if (!belongs) return c.json({ error: "這位學生不在您的班級裡" }, 403);

  const { results: tasks } = await c.env.DB.prepare("SELECT * FROM tasks WHERE student_id = ? ORDER BY date ASC").bind(student.id).all<any>();
  const { results: weakPoints } = await c.env.DB.prepare(
    `SELECT kp.title as title, COUNT(*) as wrongCount
     FROM quiz_attempts qa
     JOIN questions q ON q.id = qa.question_id
     JOIN knowledge_points kp ON kp.id = q.knowledge_point_id
     WHERE qa.student_id = ? AND qa.is_correct = 0
     GROUP BY kp.title ORDER BY wrongCount DESC LIMIT 10`
  )
    .bind(student.id)
    .all<any>();
  const stress = await computeStressLevel(c.env.DB, student.id);

  return c.json({
    student,
    tasks: (tasks || []).map((t: any) => ({ date: t.date, type: t.type, title: t.title, status: t.status, minutes: t.minutes })),
    weakPoints: weakPoints || [],
    stress,
  });
});

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "伺服器發生錯誤，請稍後再試" }, 500);
});

export default app;
