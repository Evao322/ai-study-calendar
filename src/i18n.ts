import { createContext, useContext, useState, type ReactNode } from "react";
import { createElement } from "react";

export type Lang = "zh" | "en";

const STORAGE_KEY = "lang";

export function getStoredLang(): Lang {
  const v = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  return v === "en" ? "en" : "zh";
}

function setStoredLang(lang: Lang) {
  localStorage.setItem(STORAGE_KEY, lang);
}

// 翻譯字典：用點號命名空間（畫面.項目），方便找對應的畫面
const dict = {
  zh: {
    "app.title": "AI 智能學習日曆",
    "app.subtitle": "師生雙端 AI 智能學習管理工具",

    "auth.roleStudent": "我是學生",
    "auth.roleTeacher": "我是老師",
    "auth.modeRegister": "註冊新帳號",
    "auth.modeLogin": "登入",
    "auth.username": "帳號",
    "auth.name": "姓名",
    "auth.grade": "年級",
    "auth.gradePlaceholder": "例如：五年級",
    "auth.password": "密碼",
    "auth.classCode": "班級碼（選填，老師會提供）",
    "auth.classCodePlaceholder": "例如：CAB4DS",
    "auth.processing": "處理中...",
    "auth.createAccount": "建立帳號",
    "auth.login": "登入",

    "nav.logout": "登出",
    "nav.studentSuffix": "（學生）",
    "nav.teacherSuffix": "（老師）",

    "student.tabUpload": "上傳文件",
    "student.tabCalendar": "日曆管理",
    "student.stressPrefix": "學習壓力：",

    "upload.heading": "上傳學習文件",
    "upload.hint": "可以直接上傳 PDF 或 PowerPoint（.pptx）檔案，也可以貼上文字，AI 會自動拆解出知識點。",
    "upload.subject": "科目",
    "upload.subjectPlaceholder": "例如：數學",
    "upload.methodFile": "方式一：上傳檔案（PDF / PPTX）",
    "upload.fileSelected": "已選擇檔案：{name}",
    "upload.or": "或",
    "upload.methodText": "方式二：貼上文字",
    "upload.textPlaceholder": "例如：第一章 分數的加減法...\n第二章 小數的乘除法...",
    "upload.analyzing": "解析中...（可能需要十幾秒，請耐心等候）",
    "upload.button": "上傳並解析",
    "upload.approxMinutes": "約 {n} 分鐘",
    "upload.practiceQuiz": "出題練習",
    "upload.minLengthError": "請貼上至少 10 個字的文字，或選擇一個檔案",
    "upload.weakPoints": "薄弱知識點",
    "upload.wrongTimes": "{title} — 錯了 {n} 次",

    "cal.prevMonth": "上個月",
    "cal.nextMonth": "下個月",
    "cal.backToToday": "回到今天",
    "cal.searchTasks": "搜尋任務",
    "cal.monthView": "月曆檢視",
    "cal.aiSettings": "AI 排程設定",
    "cal.searchPlaceholder": "搜尋任務名稱，按 Enter 跳到該日期",
    "cal.search": "搜尋",
    "cal.noMatch": "找不到符合的任務",
    "cal.deadline": "截止日期",
    "cal.dailyMinutes": "每日可學習分鐘",
    "cal.mode2": "模式 2：AI 審核目前計劃",
    "cal.mode3": "模式 3：AI 全自動排程",
    "cal.needUploadFirst": "請先到「上傳文件」分頁上傳學習內容，才能使用全自動排程。",
    "cal.aiSuggestions": "AI 建議：",
    "cal.addTask": "新增任務",
    "cal.noTasksToday": "這天還沒有安排任務。",
    "cal.taskSubjectPlaceholder": "科目，例如：數學",
    "cal.taskNamePlaceholder": "任務名稱",
    "cal.estimatedMinutes": "預計分鐘數",
    "cal.add": "新增",
    "cal.cancel": "取消",
    "cal.delete": "刪除",
    "cal.more": "+{n} 更多",
    "cal.minutesShort": "{n} 分鐘",

    "quiz.titlePrefix": "出題練習：",
    "quiz.hint": "會根據您上傳的文件內容，一次出一份完整的練習題（不分難度）。",
    "quiz.generating": "出題中...（可能需要十幾秒，請耐心等候）",
    "quiz.regenerate": "重新出題",
    "quiz.generate": "產生題目",
    "quiz.aiUnavailable": "目前 AI 暫時無法連線（可能是流量較高），沒有辦法產生題目，請稍後再按一次「重新出題」試試看。",
    "quiz.submit": "提交答案",
    "common.close": "關閉",

    "teacher.classManagement": "班級管理",
    "teacher.newClassPlaceholder": "新班級名稱，例如：五年一班",
    "teacher.createClass": "建立班級",
    "teacher.classCode": "班級碼",
    "teacher.copy": "複製",
    "teacher.copied": "已複製！",
    "teacher.classOverview": "全班學情總覽",
    "teacher.noStudentsYet": "目前這個班級還沒有學生加入。請把班級碼交給學生，讓他們註冊時填入。",
    "teacher.colName": "姓名",
    "teacher.colGrade": "年級",
    "teacher.colCompletion": "近 7 天完成率",
    "teacher.colStress": "壓力狀態",
    "teacher.noData": "尚無資料",
    "teacher.needsAttention": "需要關注",
    "teacher.viewDetails": "查看詳情",
    "teacher.studentStatusTitle": "{name} 的學習狀況（{grade}）",
    "teacher.stressStatus": "壓力狀態：",
    "teacher.weakPoints": "薄弱知識點",
    "teacher.noWeakPoints": "目前沒有明顯的薄弱知識點。",
    "teacher.wrongTimes": "{title} — 錯了 {n} 次",
    "teacher.calendarTasks": "日曆任務",
    "teacher.noTasks": "尚無任務",
    "teacher.taskLine": "{date} · {title}（{n} 分）",

    "type.new": "新知",
    "type.review": "複習",
    "type.practice": "練習",
    "type.test": "測驗",
    "type.custom": "自訂",

    "level.必學": "必學",
    "level.熟練": "熟練",
    "level.了解": "了解",

    "stress.輕鬆": "輕鬆",
    "stress.正常": "正常",
    "stress.偏高": "偏高",
    "stress.過載": "過載",

    "stressReason.學習節奏正常。": "學習節奏正常。",
    "stressReason.連續多天單日學習時間過長。": "連續多天單日學習時間過長。",
    "stressReason.最近完成率偏低，可能進度跟不上。": "最近完成率偏低，可能進度跟不上。",
    "stressReason.有一天學習時間偏長。": "有一天學習時間偏長。",
    "stressReason.完成率稍低，建議留意。": "完成率稍低，建議留意。",
    "stressReason.今天的學習安排較輕鬆。": "今天的學習安排較輕鬆。",

    "subject.未分類": "未分類",
    "subject.測驗": "測驗",
  },
  en: {
    "app.title": "AI Study Calendar",
    "app.subtitle": "AI-powered study planner for students and teachers",

    "auth.roleStudent": "I'm a Student",
    "auth.roleTeacher": "I'm a Teacher",
    "auth.modeRegister": "Create Account",
    "auth.modeLogin": "Log In",
    "auth.username": "Username",
    "auth.name": "Name",
    "auth.grade": "Grade",
    "auth.gradePlaceholder": "e.g. Grade 5",
    "auth.password": "Password",
    "auth.classCode": "Class Code (optional, from your teacher)",
    "auth.classCodePlaceholder": "e.g. CAB4DS",
    "auth.processing": "Processing...",
    "auth.createAccount": "Create Account",
    "auth.login": "Log In",

    "nav.logout": "Log Out",
    "nav.studentSuffix": " (Student)",
    "nav.teacherSuffix": " (Teacher)",

    "student.tabUpload": "Upload Document",
    "student.tabCalendar": "Calendar",
    "student.stressPrefix": "Study stress: ",

    "upload.heading": "Upload Study Material",
    "upload.hint": "Upload a PDF or PowerPoint (.pptx) file, or paste text — AI will automatically break it into knowledge points.",
    "upload.subject": "Subject",
    "upload.subjectPlaceholder": "e.g. Math",
    "upload.methodFile": "Method 1: Upload a File (PDF / PPTX)",
    "upload.fileSelected": "Selected file: {name}",
    "upload.or": "or",
    "upload.methodText": "Method 2: Paste Text",
    "upload.textPlaceholder": "e.g. Chapter 1 Adding fractions...\nChapter 2 Multiplying decimals...",
    "upload.analyzing": "Analyzing... (may take 10-20 seconds, please wait)",
    "upload.button": "Upload & Analyze",
    "upload.approxMinutes": "~{n} min",
    "upload.practiceQuiz": "Practice Quiz",
    "upload.minLengthError": "Please paste at least 10 characters, or choose a file.",
    "upload.weakPoints": "Weak Points",
    "upload.wrongTimes": "{title} — missed {n} times",

    "cal.prevMonth": "Previous month",
    "cal.nextMonth": "Next month",
    "cal.backToToday": "Back to today",
    "cal.searchTasks": "Search tasks",
    "cal.monthView": "Month view",
    "cal.aiSettings": "AI scheduling settings",
    "cal.searchPlaceholder": "Search task name, press Enter to jump to date",
    "cal.search": "Search",
    "cal.noMatch": "No matching task found",
    "cal.deadline": "Deadline",
    "cal.dailyMinutes": "Daily study minutes",
    "cal.mode2": "Mode 2: AI review current plan",
    "cal.mode3": "Mode 3: AI full auto-schedule",
    "cal.needUploadFirst": "Please upload study material in the \"Upload Document\" tab first to use auto-scheduling.",
    "cal.aiSuggestions": "AI suggestions:",
    "cal.addTask": "Add task",
    "cal.noTasksToday": "No tasks scheduled for this day.",
    "cal.taskSubjectPlaceholder": "Subject, e.g. Math",
    "cal.taskNamePlaceholder": "Task name",
    "cal.estimatedMinutes": "Estimated minutes",
    "cal.add": "Add",
    "cal.cancel": "Cancel",
    "cal.delete": "Delete",
    "cal.more": "+{n} more",
    "cal.minutesShort": "{n} min",

    "quiz.titlePrefix": "Practice Quiz: ",
    "quiz.hint": "Generates one complete practice set based on your uploaded content (no difficulty levels).",
    "quiz.generating": "Generating... (may take 10-20 seconds, please wait)",
    "quiz.regenerate": "Regenerate",
    "quiz.generate": "Generate Questions",
    "quiz.aiUnavailable": "AI is temporarily unavailable right now (possibly high demand). Please try \"Regenerate\" again in a moment.",
    "quiz.submit": "Submit Answer",
    "common.close": "Close",

    "teacher.classManagement": "Class Management",
    "teacher.newClassPlaceholder": "New class name, e.g. Class 5A",
    "teacher.createClass": "Create Class",
    "teacher.classCode": "Class code",
    "teacher.copy": "Copy",
    "teacher.copied": "Copied!",
    "teacher.classOverview": "Class Overview",
    "teacher.noStudentsYet": "No students have joined this class yet. Share the class code so they can enter it when registering.",
    "teacher.colName": "Name",
    "teacher.colGrade": "Grade",
    "teacher.colCompletion": "7-Day Completion",
    "teacher.colStress": "Stress Level",
    "teacher.noData": "No data",
    "teacher.needsAttention": "Needs Attention",
    "teacher.viewDetails": "View Details",
    "teacher.studentStatusTitle": "{name}'s study status ({grade})",
    "teacher.stressStatus": "Stress level: ",
    "teacher.weakPoints": "Weak Points",
    "teacher.noWeakPoints": "No clear weak points right now.",
    "teacher.wrongTimes": "{title} — missed {n} times",
    "teacher.calendarTasks": "Calendar Tasks",
    "teacher.noTasks": "No tasks yet",
    "teacher.taskLine": "{date} · {title} ({n} min)",

    "type.new": "New",
    "type.review": "Review",
    "type.practice": "Practice",
    "type.test": "Test",
    "type.custom": "Custom",

    "level.必學": "Essential",
    "level.熟練": "Practice",
    "level.了解": "Overview",

    "stress.輕鬆": "Light",
    "stress.正常": "Normal",
    "stress.偏高": "Elevated",
    "stress.過載": "Overloaded",

    "stressReason.學習節奏正常。": "Your study pace looks healthy.",
    "stressReason.連續多天單日學習時間過長。": "Study time has been too long on multiple days in a row.",
    "stressReason.最近完成率偏低，可能進度跟不上。": "Recent completion rate is low — you may be falling behind.",
    "stressReason.有一天學習時間偏長。": "One day had unusually long study hours.",
    "stressReason.完成率稍低，建議留意。": "Completion rate is a bit low — worth keeping an eye on.",
    "stressReason.今天的學習安排較輕鬆。": "Today's schedule is light.",

    "subject.未分類": "Uncategorized",
    "subject.測驗": "Test",
  },
} as const;

export type TranslationKey = keyof typeof dict.zh;

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getStoredLang());

  function setLang(next: Lang) {
    setLangState(next);
    setStoredLang(next);
  }

  function t(key: TranslationKey, vars?: Record<string, string | number>): string {
    const template = dict[lang][key] ?? dict.zh[key] ?? key;
    return interpolate(template, vars);
  }

  return createElement(LanguageContext.Provider, { value: { lang, setLang, t } }, children);
}

export function useLang(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used inside LanguageProvider");
  return ctx;
}

// 以下是「固定詞彙」的翻譯小工具：這些值是後端回傳的中文字串（例如知識點等級、壓力等級），
// 不是透過字典 key 查詢，而是直接把中文值對應到翻譯。
export function levelLabel(level: string, lang: Lang): string {
  const key = `level.${level}` as TranslationKey;
  return (dict[lang] as Record<string, string>)[key] ?? level;
}

export function stressLevelLabel(level: string, lang: Lang): string {
  const key = `stress.${level}` as TranslationKey;
  return (dict[lang] as Record<string, string>)[key] ?? level;
}

export function stressReasonLabel(reason: string, lang: Lang): string {
  const key = `stressReason.${reason}` as TranslationKey;
  return (dict[lang] as Record<string, string>)[key] ?? reason;
}

export function subjectLabel(subject: string, lang: Lang): string {
  const key = `subject.${subject}` as TranslationKey;
  return (dict[lang] as Record<string, string>)[key] ?? subject;
}

export function taskTypeLabel(type: string, lang: Lang): string {
  const key = `type.${type}` as TranslationKey;
  return (dict[lang] as Record<string, string>)[key] ?? type;
}
