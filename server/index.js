import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { documentsRouter } from "./routes/documents.js";
import { calendarRouter } from "./routes/calendar.js";
import { quizRouter } from "./routes/quiz.js";
import { teacherRouter } from "./routes/teacher.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/calendar", calendarRouter);
app.use("/api/quiz", quizRouter);
app.use("/api/teacher", teacherRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "伺服器發生錯誤，請稍後再試" });
});

const port = process.env.PORT || 8787;
app.listen(port, () => {
  console.log(`[server] 本機後端已啟動：http://localhost:${port}`);
});
