import express from "express";
import multer from "multer";
import { nanoid } from "nanoid";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { parseDocumentToKnowledgePoints } from "../gemini.js";
import { extractTextFromFile, UnsupportedFileError } from "../documentParser.js";

export const documentsRouter = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

documentsRouter.use(requireAuth);

// 上傳文件：支援 PDF、PowerPoint（.pptx），或直接貼上文字
documentsRouter.post("/upload", upload.single("file"), async (req, res) => {
  const studentId = req.user.id;
  const subject = (req.body?.subject || "未分類").trim().slice(0, 20) || "未分類";
  let rawText = req.body?.text || "";
  if (req.file) {
    try {
      rawText = await extractTextFromFile(req.file.originalname, req.file.mimetype, req.file.buffer);
    } catch (err) {
      if (err instanceof UnsupportedFileError) return res.status(400).json({ error: err.message });
      console.error("[documents] 檔案解析失敗：", err);
      return res.status(400).json({ error: "檔案解析失敗，請確認檔案沒有損壞" });
    }
  }
  if (!rawText || rawText.trim().length < 10) {
    return res.status(400).json({ error: "文件內容太短，請確認上傳的檔案或貼上的文字" });
  }

  const docId = `doc_${nanoid(10)}`;
  db.prepare(
    "INSERT INTO documents (id, student_id, filename, raw_text, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(docId, studentId, req.file?.originalname || "手動貼上的文字", rawText, new Date().toISOString());

  const knowledgePoints = await parseDocumentToKnowledgePoints(rawText);

  const insertKp = db.prepare(
    "INSERT INTO knowledge_points (id, document_id, student_id, title, level, est_minutes, order_index, subject) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const saved = knowledgePoints.map((kp, i) => {
    const id = `kp_${nanoid(10)}`;
    insertKp.run(id, docId, studentId, kp.title, kp.level, kp.estMinutes, i, subject);
    return { id, documentId: docId, subject, ...kp };
  });

  res.json({ documentId: docId, knowledgePoints: saved });
});

documentsRouter.get("/knowledge-points", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM knowledge_points WHERE student_id = ? ORDER BY order_index ASC")
    .all(req.user.id);
  res.json({
    knowledgePoints: rows.map((r) => ({
      id: r.id,
      documentId: r.document_id,
      title: r.title,
      level: r.level,
      estMinutes: r.est_minutes,
      subject: r.subject || "未分類",
    })),
  });
});
