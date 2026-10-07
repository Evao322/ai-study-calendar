import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type Lang = "zh" | "en";

const STORAGE_KEY = "ai-study-calendar.lang";

const dict = {
  appTitle: { zh: "AI 智能學習日曆", en: "AI Study Calendar" },
  logout: { zh: "登出", en: "Log out" },
  close: { zh: "關閉", en: "Close" },
  cancel: { zh: "取消", en: "Cancel" },
  unclassifiedSubject: { zh: "未分類", en: "Uncategorized" },

  // auth screen
  authSubtitle: { zh: "師生雙端 AI 智能學習管理工具", en: "AI-powered study management for teachers & students" },
  roleStudent: { zh: "我是學生", en: "I'm a Student" },
  roleTeacher: { zh: "我是老師", en: "I'm a Teacher" },
  modeRegister: { zh: "註冊新帳號", en: "Sign Up" },
  modeLogin: { zh: "登入", en: "Log In" },
  fieldUsername: { zh: "帳號", en: "Username" },
  fieldName: { zh: "姓名", en: "Name" },
  fieldGrade: { zh: "年級", en: "Grade" },
  fieldGradePlaceholder: { zh: "例如：五年級", en: "e.g. Grade 5" },
  fieldPassword: { zh: "密碼", en: "Password" },
  fieldClassCode: { zh: "班級碼（選填，老師會提供）", en: "Class code (optional, provided by your teacher)" },
  fieldClassCodePlaceholder: { zh: "例如：CAB4DS", en: "e.g. CAB4DS" },
  submitting: { zh: "處理中...", en: "Processing..." },
  submitCreate: { zh: "建立帳號", en: "Create Account" },
  submitLogin: { zh: "登入", en: "Log In" },

  // teacher dashboard
  teacherSuffix: { zh: "（老師）", en: " (Teacher)" },
  classManagement: { zh: "班級管理", en: "Class Management" },
  newClassPlaceholder: { zh: "新班級名稱，例如：五年一班", en: "New class name, e.g. Grade 5 Class 1" },
  createClass: { zh: "建立班級", en: "Create Class" },
  classCodeLabel: { zh: "班級碼", en: "Code" },
  copyCode: { zh: "複製", en: "Copy" },
  copiedCode: { zh: "已複製", en: "Copied" },
  classOverview: { zh: "全班學情總覽", en: "Class Overview" },
  noStudentsHint: {
    zh: "目前這個班級還沒有學生加入。請把班級碼交給學生，讓他們註冊時填入。",
    en: "No students have joined this class yet. Share the class code so they can enter it when registering.",
  },
  colName: { zh: "姓名", en: "Name" },
  colGrade: { zh: "年級", en: "Grade" },
  colCompletion: { zh: "近 7 天完成率", en: "7-day Completion" },
  colStress: { zh: "壓力狀態", en: "Stress Level" },
  noData: { zh: "尚無資料", en: "No data" },
  needsAttention: { zh: "需要關注", en: "Needs Attention" },
  viewDetails: { zh: "查看詳情", en: "View Details" },
  stressLabel: { zh: "壓力狀態：", en: "Stress Level: " },
  weakPoints: { zh: "薄弱知識點", en: "Weak Points" },
  noWeakPoints: { zh: "目前沒有明顯的薄弱知識點。", en: "No significant weak points right now." },
  wrongCount: { zh: "錯了 {n} 次", en: "{n} mistakes" },
  calendarTasks: { zh: "日曆任務", en: "Calendar Tasks" },
  noTasks: { zh: "尚無任務", en: "No tasks yet" },
  minutesSuffix: { zh: "分", en: "min" },

  // student dashboard
  studentSuffix: { zh: "（學生）", en: " (Student)" },
  stressBannerLabel: { zh: "學習壓力：", en: "Study stress: " },
  tabUpload: { zh: "上傳文件", en: "Upload Materials" },
  tabCalendar: { zh: "日曆管理", en: "Calendar" },

  // calendar view
  prevMonth: { zh: "上個月", en: "Previous month" },
  nextMonth: { zh: "下個月", en: "Next month" },
  backToToday: { zh: "回到今天", en: "Today" },
  searchTasks: { zh: "搜尋任務", en: "Search tasks" },
  calendarViewTitle: { zh: "月曆檢視", en: "Calendar view" },
  aiSettingsTitle: { zh: "AI 排程設定", en: "AI scheduling settings" },
  searchPlaceholder: { zh: "搜尋任務名稱，按 Enter 跳到該日期", en: "Search task name, press Enter to jump to date" },
  searchButton: { zh: "搜尋", en: "Search" },
  searchNotFound: { zh: "找不到符合的任務", en: "No matching task found" },
  deadlineLabel: { zh: "截止日期", en: "Deadline" },
  dailyMinutesLabel: { zh: "每日可學習分鐘", en: "Daily study minutes" },
  mode2Button: { zh: "模式 2：AI 審核目前計劃", en: "Mode 2: AI Review Current Plan" },
  mode3Button: { zh: "模式 3：AI 全自動排程", en: "Mode 3: AI Auto Schedule" },
  needKpHint: {
    zh: "請先到「上傳文件」分頁上傳學習內容，才能使用全自動排程。",
    en: 'Upload study materials in the "Upload Materials" tab first to use auto scheduling.',
  },
  aiSuggestions: { zh: "AI 建議：", en: "AI Suggestions:" },
  moreCount: { zh: "+{n} 更多", en: "+{n} more" },
  addTaskTitle: { zh: "新增任務", en: "Add task" },
  taskTypeNew: { zh: "新知", en: "New" },
  taskTypeReview: { zh: "複習", en: "Review" },
  taskTypePractice: { zh: "練習", en: "Practice" },
  taskTypeTest: { zh: "測驗", en: "Test" },
  taskTypeCustom: { zh: "自訂", en: "Custom" },
  subjectPlaceholder: { zh: "科目，例如：數學", en: "Subject, e.g. Math" },
  taskTitlePlaceholder: { zh: "任務名稱", en: "Task name" },
  minutesTitle: { zh: "預計分鐘數", en: "Estimated minutes" },
  add: { zh: "新增", en: "Add" },
  noTaskForDay: { zh: "這天還沒有安排任務。", en: "No tasks scheduled for this day." },
  delete: { zh: "刪除", en: "Delete" },

  // quiz modal
  quizTitle: { zh: "出題練習：{title}", en: "Practice Quiz: {title}" },
  quizHint: {
    zh: "會根據您上傳的文件內容，一次出一份完整的練習題（不分難度）。",
    en: "Generates a full practice set based on your uploaded materials (no difficulty levels).",
  },
  generating: { zh: "出題中...（可能需要十幾秒，請耐心等候）", en: "Generating... (may take up to ~10s, please wait)" },
  regenerate: { zh: "重新出題", en: "Regenerate" },
  generateQuestions: { zh: "產生題目", en: "Generate Questions" },
  aiUnavailable: {
    zh: "目前 AI 暫時無法連線（可能是流量較高），沒有辦法產生題目，請稍後再按一次「重新出題」試試看。",
    en: 'AI is temporarily unavailable (possibly high traffic) and couldn\'t generate questions. Please try "Regenerate" again shortly.',
  },
  submitAnswer: { zh: "提交答案", en: "Submit Answer" },

  // upload tab
  uploadTitle: { zh: "上傳學習文件", en: "Upload Study Materials" },
  uploadHint: {
    zh: "可以直接上傳 PDF 或 PowerPoint（.pptx）檔案，也可以貼上文字，AI 會自動拆解出知識點。",
    en: "Upload a PDF or PowerPoint (.pptx) file directly, or paste text — AI will automatically break it into knowledge points.",
  },
  subjectLabel: { zh: "科目", en: "Subject" },
  methodFile: { zh: "方式一：上傳檔案（PDF / PPTX）", en: "Method 1: Upload File (PDF / PPTX)" },
  or: { zh: "或", en: "or" },
  methodText: { zh: "方式二：貼上文字", en: "Method 2: Paste Text" },
  textPlaceholder: {
    zh: "例如：第一章 分數的加減法...\n第二章 小數的乘除法...",
    en: "e.g. Chapter 1 Adding & Subtracting Fractions...\nChapter 2 Multiplying & Dividing Decimals...",
  },
  uploadMinLengthError: { zh: "請貼上至少 10 個字的文字，或選擇一個檔案", en: "Please paste at least 10 characters of text, or select a file" },
  uploading: { zh: "解析中...（可能需要十幾秒，請耐心等候）", en: "Analyzing... (may take up to ~10s, please wait)" },
  uploadSubmit: { zh: "上傳並解析", en: "Upload & Analyze" },
  practiceButton: { zh: "出題練習", en: "Practice Quiz" },
  fileSelected: { zh: "已選擇檔案：{name}", en: "File selected: {name}" },
  aboutMinutes: { zh: "約 {n} 分鐘", en: "~{n} min" },

  // level / stress value labels (enumerated values returned by the backend)
  level必學: { zh: "必學", en: "Essential" },
  level熟練: { zh: "熟練", en: "Practice" },
  level了解: { zh: "了解", en: "Background" },
  level輕鬆: { zh: "輕鬆", en: "Light" },
  level正常: { zh: "正常", en: "Normal" },
  level偏高: { zh: "偏高", en: "Elevated" },
  level過載: { zh: "過載", en: "Overloaded" },
} as const;

export type TKey = keyof typeof dict;

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<Ctx | null>(null);

function readStoredLang(): Lang {
  if (typeof window === "undefined") return "zh";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "en" || stored === "zh" ? stored : "zh";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => readStoredLang());

  function setLang(l: Lang) {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore storage errors (e.g. private browsing)
    }
  }

  function toggleLang() {
    setLang(lang === "zh" ? "en" : "zh");
  }

  const t = useMemo(
    () => (key: TKey, vars?: Record<string, string | number>) => interpolate(dict[key][lang], vars),
    [lang]
  );

  return <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): Ctx {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}

/** Translate an enumerated label value returned by the backend (e.g. task level, stress level). */
export function translateLabel(t: Ctx["t"], raw: string): string {
  const key = `level${raw}` as TKey;
  return (dict as Record<string, { zh: string; en: string } | undefined>)[key] ? t(key) : raw;
}
