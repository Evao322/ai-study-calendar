import express from "express";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { db } from "../db.js";
import { signToken } from "../middleware/auth.js";

export const authRouter = express.Router();

function nowIso() {
  return new Date().toISOString();
}

authRouter.post("/register-teacher", (req, res) => {
  const { username, name, password } = req.body || {};
  if (!username || !name || !password) return res.status(400).json({ error: "請填寫帳號、姓名、密碼" });
  const exists = db.prepare("SELECT id FROM teachers WHERE username = ?").get(username);
  if (exists) return res.status(400).json({ error: "這個帳號已經被使用了" });

  const id = `t_${nanoid(10)}`;
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    "INSERT INTO teachers (id, username, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, username, name, hash, nowIso());

  const token = signToken({ id, role: "teacher", name });
  res.json({ token, user: { id, role: "teacher", name } });
});

authRouter.post("/login-teacher", (req, res) => {
  const { username, password } = req.body || {};
  const row = db.prepare("SELECT * FROM teachers WHERE username = ?").get(username);
  if (!row || !bcrypt.compareSync(password || "", row.password_hash)) {
    return res.status(401).json({ error: "帳號或密碼不正確" });
  }
  const token = signToken({ id: row.id, role: "teacher", name: row.name });
  res.json({ token, user: { id: row.id, role: "teacher", name: row.name } });
});

authRouter.post("/register-student", (req, res) => {
  const { username, name, grade, password, classCode } = req.body || {};
  if (!username || !name || !password) return res.status(400).json({ error: "請填寫帳號、姓名、密碼" });
  const exists = db.prepare("SELECT id FROM students WHERE username = ?").get(username);
  if (exists) return res.status(400).json({ error: "這個帳號已經被使用了" });

  let classRow = null;
  if (classCode) {
    classRow = db.prepare("SELECT * FROM classes WHERE code = ?").get(classCode.trim().toUpperCase());
    if (!classRow) return res.status(400).json({ error: "班級碼不正確，請跟老師確認" });
  }

  const id = `s_${nanoid(10)}`;
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    "INSERT INTO students (id, username, name, grade, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, username, name, grade || "", hash, nowIso());

  if (classRow) {
    db.prepare("INSERT OR IGNORE INTO student_classes (student_id, class_id) VALUES (?, ?)").run(id, classRow.id);
  }

  const token = signToken({ id, role: "student", name });
  res.json({ token, user: { id, role: "student", name, grade: grade || "" } });
});

authRouter.post("/login-student", (req, res) => {
  const { username, password } = req.body || {};
  const row = db.prepare("SELECT * FROM students WHERE username = ?").get(username);
  if (!row || !bcrypt.compareSync(password || "", row.password_hash)) {
    return res.status(401).json({ error: "帳號或密碼不正確" });
  }
  const token = signToken({ id: row.id, role: "student", name: row.name });
  res.json({ token, user: { id: row.id, role: "student", name: row.name, grade: row.grade } });
});

authRouter.post("/join-class", (req, res) => {
  // 已登入學生補加入另一個班級碼
  const { studentId, classCode } = req.body || {};
  const classRow = db.prepare("SELECT * FROM classes WHERE code = ?").get((classCode || "").trim().toUpperCase());
  if (!classRow) return res.status(400).json({ error: "班級碼不正確" });
  db.prepare("INSERT OR IGNORE INTO student_classes (student_id, class_id) VALUES (?, ?)").run(studentId, classRow.id);
  res.json({ ok: true, className: classRow.name });
});
