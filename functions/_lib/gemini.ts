import { GoogleGenerativeAI } from "@google/generative-ai";

export type Lang = "zh" | "en";

const MODEL_NAME = "gemini-3.8-flash";
const TIMEOUT_MS = 20000;

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

function languageDirective(lang: Lang, keepLevelChinese = false): string {
  if (lang !== "en") return "請使用繁體中文回答所有文字欄位。";
  return keepLevelChinese
    ? "Write all text fields in English, EXCEPT the \"level\" field — that must stay exactly as one of 必學 / 熟練 / 了解 in Chinese, do not translate those three words."
    : "Write all text fields in English.";
}

export type KnowledgePointDraft = { title: string; level: string; estMinutes: number };

export async function parseDocumentToKnowledgePoints(
  rawText: string,
  apiKey: string | undefined,
  lang: Lang = "zh"
): Promise<KnowledgePointDraft[]> {
  try {
    const prompt = `你是中小學教學助理，正在幫學生整理一份教學文件（可能是課本內容、也可能是從 PowerPoint 投影片擷取出來、比較零碎的條列文字）。

請你：
1. 先在腦中把零碎的條列、標題、投影片片段重新組織成完整的概念（同一個主題如果分散在好幾行／好幾張投影片，要合併成一個知識點，不要重複列出）。
2. 忽略頁碼、投影片編號、封面、目錄、作者／出版資訊、頁首頁尾、版權聲明、課程大綱或評分方式說明、「謝謝聆聽」之類的版面裝飾或行政性文字——這些都不是學科知識，絕對不要列為知識點。
3. 只挑選真正重要、學生需要讀懂記住的學科知識，不要為了湊數而列出瑣碎、不重要的細節。寧可少於 12 個，也不要硬湊。
4. 拆解出 3 到 12 個「實際的學習重點」，每個都必須是文件裡真的有教到的具體概念，不可以是籠統的大標題（例如不要只寫「第三章」，要寫這章實際教了什麼）。

每個知識點要有：
- title：具體、簡短的知識點名稱（15 字以內）
- level：這個概念的重要程度，"必學"（考試核心、一定要會）、"熟練"（需要多練習）、"了解"（背景知識、認識即可）三選一
- estMinutes：合理的學習時間（20 到 60 之間的整數分鐘）

${languageDirective(lang, true)}
只回傳 JSON 陣列，不要有其他文字或 Markdown 符號。

文件內容：
"""
${rawText.slice(0, 12000)}
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
    return fallbackParseDocument(rawText, lang);
  }
}

function fallbackParseDocument(rawText: string, lang: Lang): KnowledgePointDraft[] {
  const junkPatterns = [/^第?\s*\d+\s*頁$/, /^\d+$/, /^【投影片\s*\d+】?$/, /^謝謝/, /^thank you/i, /^page\s*\d+/i];

  const seen = new Set<string>();
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.replace(/^【投影片\s*\d+】/, "").trim())
    .filter((l) => l.length >= 6 && l.length <= 100)
    .filter((l) => !junkPatterns.some((p) => p.test(l)))
    .filter((l) => {
      const key = l.slice(0, 12);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);

  const placeholder =
    lang === "en"
      ? "Main content of this document (AI is temporarily unavailable for analysis — please ask your teacher to review)"
      : "本文件的主要內容（AI 暫時無法自動分析，請老師協助確認細項）";
  const base = lines.length > 0 ? lines : [placeholder];
  const levels = ["必學", "熟練", "了解"];
  return base.map((title, i) => ({
    title: title.length > 40 ? title.slice(0, 40) + "…" : title,
    level: levels[i % levels.length],
    estMinutes: 30,
  }));
}

export async function reviewManualPlan(
  tasks: { date: string; type: string; title: string; minutes: number }[],
  deadlineDate: string,
  apiKey: string | undefined,
  lang: Lang = "zh"
): Promise<string[]> {
  try {
    const prompt = `你是學習規劃顧問。以下是一位學生手動安排的學習任務列表（日期、類型、標題、分鐘數），截止日期是 ${deadlineDate}。
請檢查：單日時間是否過量（超過 180 分鐘視為過量）、是否有複習任務、任務是否太少、是否完全沒有休息安排。
回傳 JSON 陣列，每一項是一句建議（字串）。最多 6 條建議，沒有問題就回傳空陣列 []。
${languageDirective(lang)}

任務列表：
${JSON.stringify(tasks)}`;
    const data = await callJsonModel(prompt, apiKey);
    if (Array.isArray(data)) return data.map(String);
    throw new Error("unexpected format");
  } catch (err) {
    console.warn("[gemini] reviewManualPlan 改用備用邏輯：", err instanceof Error ? err.message : err);
    return fallbackReviewPlan(tasks, lang);
  }
}

function fallbackReviewPlan(tasks: { date: string; type: string; minutes: number }[], lang: Lang): string[] {
  const suggestions: string[] = [];
  const byDate: Record<string, number> = {};
  for (const t of tasks) byDate[t.date] = (byDate[t.date] || 0) + (t.minutes || 30);
  for (const [date, minutes] of Object.entries(byDate)) {
    if (minutes > 180) {
      suggestions.push(
        lang === "en"
          ? `${date} has ${minutes} minutes scheduled — that's a lot, consider spreading it across other days.`
          : `${date} 當天安排了 ${minutes} 分鐘，時間偏多，建議分散到其他天。`
      );
    }
  }
  if (!tasks.some((t) => t.type === "review")) {
    suggestions.push(
      lang === "en"
        ? "Your plan doesn't include any review tasks — add periodic review to avoid forgetting."
        : "目前的計劃沒有安排「複習」任務，建議加入定期複習，避免遺忘。"
    );
  }
  if (tasks.length === 0) {
    suggestions.push(lang === "en" ? "No tasks scheduled yet — try adding a few study tasks first." : "目前還沒有安排任何任務，建議先加入幾個學習任務。");
  }
  return suggestions;
}

export type QuestionDraft = { type: "choice" | "short"; content: string; options: string[] | null; answer: string };

const QUESTION_COUNT = 8;

// 出題：一次針對整個知識點的原文內容出一份完整題目（不分難度等級），
// AI 暫時無法使用時不會生成假題目，而是誠實回報，讓前端顯示清楚的提示。
export async function generateQuestions(
  topicTitle: string,
  sourceExcerpt: string,
  apiKey: string | undefined,
  lang: Lang = "zh"
): Promise<{ questions: QuestionDraft[]; aiAvailable: boolean }> {
  try {
    const prompt = `你是出題老師。這是學生正在複習的知識點：「${topicTitle}」。
以下是這份學習文件的原文內容，請你只根據這段原文出題，不要用原文沒提到的知識，確保學生只要讀懂這段原文就能答對：
"""
${sourceExcerpt.slice(0, 6000)}
"""

請針對「${topicTitle}」這個知識點，從上面的原文出一份完整的練習題，涵蓋這個知識點裡所有值得複習的重點，總共 ${QUESTION_COUNT} 題，適合中小學生。
題目難度不用分級，但整體要從基本概念到比較需要理解的部分都覆蓋到。
不要出跟學科內容無關的題目（例如課程資訊、作業繳交方式、頁碼、作者、版權聲明）。每一題都必須測驗真正重要的學科知識，不要問瑣碎或不重要的細節（例如不影響理解的次要數字或年份，除非那正是這個知識點的重點）。
每題包含：
- type："choice" 或 "short"
- content：完整的題目句子，必須是原文裡真的有講到的內容，不可以問原文沒提到的事，絕對不可以用「＿＿＿」「____」「請填空」這種挖空題格式
- options：如果是 choice，提供 4 個選項的字串陣列（1 個正確、3 個似是而非的干擾選項）；如果是 short，給 null
- answer：正確答案（choice 給正確選項的文字；short 給簡短但明確的參考答案，必須能在原文中找到依據）

${languageDirective(lang)}
只回傳 JSON 陣列，不要有其他文字。`;
    const data = await callJsonModel(prompt, apiKey);
    if (Array.isArray(data) && data.length > 0) {
      return {
        aiAvailable: true,
        questions: data.map((q) => ({
          type: q.type === "choice" ? "choice" : "short",
          content: String(q.content || "請簡述重點。"),
          options: q.type === "choice" && Array.isArray(q.options) ? q.options.map(String) : null,
          answer: String(q.answer || ""),
        })),
      };
    }
    throw new Error("empty result");
  } catch (err) {
    console.warn("[gemini] generateQuestions 失敗，暫不出題：", err instanceof Error ? err.message : err);
    return { questions: [], aiAvailable: false };
  }
}

export async function gradeAnswer(
  question: { type: string; content: string; answer: string },
  studentAnswer: string,
  apiKey: string | undefined,
  lang: Lang = "zh"
): Promise<{ isCorrect: boolean; feedback: string }> {
  if (question.type === "choice") {
    const isCorrect = String(studentAnswer).trim() === String(question.answer).trim();
    const feedback =
      lang === "en"
        ? isCorrect
          ? "Correct!"
          : `Not quite — the correct answer is: ${question.answer}`
        : isCorrect
          ? "答對了！"
          : `答案不正確，正確答案是：${question.answer}`;
    return { isCorrect, feedback };
  }
  try {
    const prompt = `題目：${question.content}
參考答案：${question.answer}
學生的回答：${studentAnswer}

請判斷學生的回答是否大致正確（isCorrect: true/false），並給一句簡短的回饋（feedback）。
${languageDirective(lang)}
只回傳 JSON 物件，例如 {"isCorrect": true, "feedback": "..."}`;
    const data = (await callJsonModel(prompt, apiKey)) as { isCorrect?: boolean; feedback?: string };
    return { isCorrect: Boolean(data.isCorrect), feedback: String(data.feedback || "") };
  } catch (err) {
    console.warn("[gemini] gradeAnswer 改用備用邏輯：", err instanceof Error ? err.message : err);
    const normalizedAnswer = String(question.answer || "").trim();
    const normalizedStudent = String(studentAnswer || "").trim();
    const isCorrect = normalizedAnswer.length > 0 && normalizedStudent.length > 0 && normalizedStudent.includes(normalizedAnswer);
    const feedback =
      lang === "en"
        ? normalizedStudent.length === 0
          ? "This question hasn't been answered yet."
          : isCorrect
            ? "Correct!"
            : `Hint: the reference answer is "${normalizedAnswer}". AI is temporarily unavailable, please confirm with your teacher.`
        : normalizedStudent.length === 0
          ? "這題還沒有作答。"
          : isCorrect
            ? "答對了！"
            : `提示：參考答案是「${normalizedAnswer}」，AI 暫時無法連線，請自行與老師確認細節。`;
    return { isCorrect, feedback };
  }
}
