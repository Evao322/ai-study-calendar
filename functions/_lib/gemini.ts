import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_NAME = "gemini-3.8-flash";
const TIMEOUT_MS = 12000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`gemini timed out after ${ms}ms`)), ms)),
  ]);
}

function extractJson(text: string): unknown {
  const match = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
  if (!match) throw new Error("no json found in model output");
  return JSON.parse(match[0]);
}

async function callJsonModel(prompt: string, apiKey: string | undefined): Promise<unknown> {
  if (!apiKey) throw new Error("no gemini api key configured");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const result = await withTimeout(model.generateContent(prompt), TIMEOUT_MS);
  const text = result.response.text();
  return extractJson(text);
}

export type KnowledgePointDraft = { title: string; level: string; estMinutes: number };

export async function parseDocumentToKnowledgePoints(rawText: string, apiKey: string | undefined): Promise<KnowledgePointDraft[]> {
  try {
    const prompt = `你是中小學教學助理。閱讀以下教學文件內容，拆解出 5 到 12 個知識點。
每個知識點要有：title（簡短的知識點名稱，繁體中文）、level（必學 / 熟練 / 了解 三選一）、estMinutes（建議學習分鐘數，20 到 60 之間的整數）。
只回傳 JSON 陣列，不要有其他文字。

文件內容：
"""
${rawText.slice(0, 6000)}
"""`;
    const data = await callJsonModel(prompt, apiKey);
    if (Array.isArray(data) && data.length > 0) {
      return data.map((d) => ({
        title: String(d.title || "未命名知識點").slice(0, 80),
        level: ["必學", "熟練", "了解"].includes(d.level) ? d.level : "熟練",
        estMinutes: Number(d.estMinutes) > 0 ? Math.round(d.estMinutes) : 30,
      }));
    }
    throw new Error("empty result");
  } catch (err) {
    console.warn("[gemini] parseDocumentToKnowledgePoints 改用備用邏輯：", err instanceof Error ? err.message : err);
    return fallbackParseDocument(rawText);
  }
}

function fallbackParseDocument(rawText: string): KnowledgePointDraft[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 4 && l.length <= 60)
    .slice(0, 8);
  const base = lines.length > 0 ? lines : ["本文件的主要內容（請老師協助確認細項）"];
  const levels = ["必學", "熟練", "了解"];
  return base.map((title, i) => ({ title, level: levels[i % levels.length], estMinutes: 30 }));
}

export async function reviewManualPlan(
  tasks: { date: string; type: string; title: string; minutes: number }[],
  deadlineDate: string,
  apiKey: string | undefined
): Promise<string[]> {
  try {
    const prompt = `你是學習規劃顧問。以下是一位學生手動安排的學習任務列表（日期、類型、標題、分鐘數），截止日期是 ${deadlineDate}。
請檢查：單日時間是否過量（超過 180 分鐘視為過量）、是否有複習任務、任務是否太少、是否完全沒有休息安排。
回傳 JSON 陣列，每一項是一句繁體中文建議（字串）。最多 6 條建議，沒有問題就回傳空陣列 []。

任務列表：
${JSON.stringify(tasks)}`;
    const data = await callJsonModel(prompt, apiKey);
    if (Array.isArray(data)) return data.map(String);
    throw new Error("unexpected format");
  } catch (err) {
    console.warn("[gemini] reviewManualPlan 改用備用邏輯：", err instanceof Error ? err.message : err);
    return fallbackReviewPlan(tasks);
  }
}

function fallbackReviewPlan(tasks: { date: string; type: string; minutes: number }[]): string[] {
  const suggestions: string[] = [];
  const byDate: Record<string, number> = {};
  for (const t of tasks) byDate[t.date] = (byDate[t.date] || 0) + (t.minutes || 30);
  for (const [date, minutes] of Object.entries(byDate)) {
    if (minutes > 180) suggestions.push(`${date} 當天安排了 ${minutes} 分鐘，時間偏多，建議分散到其他天。`);
  }
  if (!tasks.some((t) => t.type === "review")) suggestions.push("目前的計劃沒有安排「複習」任務，建議加入定期複習，避免遺忘。");
  if (tasks.length === 0) suggestions.push("目前還沒有安排任何任務，建議先加入幾個學習任務。");
  return suggestions;
}

export type QuestionDraft = { type: "choice" | "short"; content: string; options: string[] | null; answer: string };

export async function generateQuestions(topicTitle: string, difficulty: string, count: number, apiKey: string | undefined): Promise<QuestionDraft[]> {
  try {
    const diffLabel = ({ basic: "基礎題", advanced: "提升題", extension: "拓展題" } as Record<string, string>)[difficulty] || "基礎題";
    const prompt = `你是出題老師。針對知識點「${topicTitle}」，出 ${count} 題${diffLabel}（繁體中文，適合中小學生）。
每題包含：type（"choice" 或 "short"）、content（題目文字）、options（如果是 choice，提供 4 個選項的字串陣列；如果是 short，給 null）、answer（正確答案；choice 給正確選項文字，short 給簡短參考答案）。
只回傳 JSON 陣列。`;
    const data = await callJsonModel(prompt, apiKey);
    if (Array.isArray(data) && data.length > 0) {
      return data.map((q) => ({
        type: q.type === "choice" ? "choice" : "short",
        content: String(q.content || "請簡述重點。"),
        options: q.type === "choice" && Array.isArray(q.options) ? q.options.map(String) : null,
        answer: String(q.answer || ""),
      }));
    }
    throw new Error("empty result");
  } catch (err) {
    console.warn("[gemini] generateQuestions 改用備用邏輯：", err instanceof Error ? err.message : err);
    return fallbackQuestions(topicTitle, count);
  }
}

function fallbackQuestions(topicTitle: string, count: number): QuestionDraft[] {
  const out: QuestionDraft[] = [];
  for (let i = 0; i < count; i++) {
    out.push({ type: "short", content: `請簡述「${topicTitle}」的重點（第 ${i + 1} 題）。`, options: null, answer: topicTitle });
  }
  return out;
}

export async function gradeAnswer(
  question: { type: string; content: string; answer: string },
  studentAnswer: string,
  apiKey: string | undefined
): Promise<{ isCorrect: boolean; feedback: string }> {
  if (question.type === "choice") {
    const isCorrect = String(studentAnswer).trim() === String(question.answer).trim();
    return { isCorrect, feedback: isCorrect ? "答對了！" : `答案不正確，正確答案是：${question.answer}` };
  }
  try {
    const prompt = `題目：${question.content}
參考答案：${question.answer}
學生的回答：${studentAnswer}

請判斷學生的回答是否大致正確（isCorrect: true/false），並給一句簡短的繁體中文回饋（feedback）。只回傳 JSON 物件，例如 {"isCorrect": true, "feedback": "..."}`;
    const data = (await callJsonModel(prompt, apiKey)) as { isCorrect?: boolean; feedback?: string };
    return { isCorrect: Boolean(data.isCorrect), feedback: String(data.feedback || "") };
  } catch (err) {
    console.warn("[gemini] gradeAnswer 改用備用邏輯：", err instanceof Error ? err.message : err);
    const loose = String(studentAnswer || "").trim().length > 0;
    return { isCorrect: loose, feedback: loose ? "已收到您的回答，老師會再確認細節。" : "這題還沒有作答。" };
  }
}
