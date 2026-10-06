import express from "express";
import { nanoid } from "nanoid";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { generateQuestions, gradeAnswer } from "../gemini.js";

export const quizRouter = express.Router();
quizRouter.use(requireAuth);

function nowIso() {
  return new Date().toISOString();
}

quizRouter.post("/generate", async (req, res) => {
  const { knowledgePointId, difficulty, count } = req.body || {};
  const kp = db.prepare("SELECT * FROM knowledge_points WHERE id = ? AND student_id = ?").get(knowledgePointId, req.user.id);
  if (!kp) return res.status(404).json({ error: "找不到這個知識點" });

  const questions = await generateQuestions(kp.title, difficulty || "basic", count || 3);
  const insert = db.prepare(
    "INSERT INTO questions (id, knowledge_point_id, student_id, difficulty, type, content, options, answer, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const saved = questions.map((q) => {
    const id = `q_${nanoid(10)}`;
    insert.run(id, kp.id, req.user.id, difficulty || "basic", q.type, q.content, JSON.stringify(q.options), q.answer, nowIso());
    return { id, type: q.type, content: q.content, options: q.options };
  });

  res.json({ questions: saved, knowledgePointTitle: kp.title });
});

quizRouter.post("/submit", async (req, res) => {
  const { questionId, answer, taskId } = req.body || {};
  const q = db.prepare("SELECT * FROM questions WHERE id = ? AND student_id = ?").get(questionId, req.user.id);
  if (!q) return res.status(404).json({ error: "找不到這個題目" });

  const question = { type: q.type, content: q.content, options: JSON.parse(q.options || "null"), answer: q.answer };
  const { isCorrect, feedback } = await gradeAnswer(question, answer);

  const id = `qa_${nanoid(10)}`;
  db.prepare(
    "INSERT INTO quiz_attempts (id, student_id, question_id, task_id, student_answer, is_correct, feedback, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(id, req.user.id, q.id, taskId || null, String(answer || ""), isCorrect ? 1 : 0, feedback, nowIso());

  res.json({ isCorrect, feedback, correctAnswer: q.answer });
});

quizRouter.get("/weak-points", (req, res) => {
  const rows = db
    .prepare(
      `SELECT kp.title as title, COUNT(*) as wrongCount
       FROM quiz_attempts qa
       JOIN questions q ON q.id = qa.question_id
       JOIN knowledge_points kp ON kp.id = q.knowledge_point_id
       WHERE qa.student_id = ? AND qa.is_correct = 0
       GROUP BY kp.title
       ORDER BY wrongCount DESC
       LIMIT 10`
    )
    .all(req.user.id);
  res.json({ weakPoints: rows });
});
