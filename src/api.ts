export type AuthUser = {
  id: string;
  role: "student" | "teacher";
  name: string;
  grade?: string;
};

function getToken(): string | null {
  return localStorage.getItem("token");
}

export function saveSession(token: string, user: AuthUser) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export function getSession(): AuthUser | null {
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`/api${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || "發生未知錯誤，請稍後再試");
  }
  return data as T;
}

export const api = {
  registerTeacher: (body: { username: string; name: string; password: string }) =>
    request<{ token: string; user: AuthUser }>("/auth/register-teacher", { method: "POST", body: JSON.stringify(body) }),
  loginTeacher: (body: { username: string; password: string }) =>
    request<{ token: string; user: AuthUser }>("/auth/login-teacher", { method: "POST", body: JSON.stringify(body) }),
  registerStudent: (body: { username: string; name: string; grade: string; password: string; classCode?: string }) =>
    request<{ token: string; user: AuthUser }>("/auth/register-student", { method: "POST", body: JSON.stringify(body) }),
  loginStudent: (body: { username: string; password: string }) =>
    request<{ token: string; user: AuthUser }>("/auth/login-student", { method: "POST", body: JSON.stringify(body) }),
  joinClass: (body: { studentId: string; classCode: string }) =>
    request<{ ok: boolean; className: string }>("/auth/join-class", { method: "POST", body: JSON.stringify(body) }),

  uploadDocument: (text: string, subject: string) =>
    request<{ documentId: string; knowledgePoints: KnowledgePoint[] }>("/documents/upload", {
      method: "POST",
      body: JSON.stringify({ text, subject }),
    }),
  uploadDocumentFile: (file: File, subject: string) => {
    const form = new FormData();
    form.append("file", file);
    form.append("subject", subject);
    return request<{ documentId: string; knowledgePoints: KnowledgePoint[] }>("/documents/upload", {
      method: "POST",
      body: form,
    });
  },
  getKnowledgePoints: () => request<{ knowledgePoints: KnowledgePoint[] }>("/documents/knowledge-points"),

  getTasks: (from?: string, to?: string) =>
    request<{ tasks: Task[] }>(`/calendar/tasks${from && to ? `?from=${from}&to=${to}` : ""}`),
  createTask: (body: { date: string; type: string; title: string; minutes: number; subject?: string; time?: string }) =>
    request<{ task: Task }>("/calendar/tasks", { method: "POST", body: JSON.stringify(body) }),
  updateTask: (
    id: string,
    body: Partial<{ status: string; date: string; title: string; minutes: number; subject: string; time: string }>
  ) => request<{ ok: boolean }>(`/calendar/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteTask: (id: string) => request<{ ok: boolean }>(`/calendar/tasks/${id}`, { method: "DELETE" }),
  reviewPlan: (deadlineDate: string) =>
    request<{ suggestions: string[] }>("/calendar/review", { method: "POST", body: JSON.stringify({ deadlineDate }) }),
  autoGenerate: (body: { deadlineDate: string; dailyMinutes: number }) =>
    request<{ tasks: Task[] }>("/calendar/auto-generate", { method: "POST", body: JSON.stringify(body) }),
  getStress: () => request<{ level: string; reason: string; completionRate: number; overloadDays: number }>("/calendar/stress"),

  generateQuiz: (body: { knowledgePointId: string }) =>
    request<{ questions: Question[]; knowledgePointTitle: string; aiAvailable: boolean }>("/quiz/generate", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  submitQuiz: (body: { questionId: string; answer: string; taskId?: string }) =>
    request<{ isCorrect: boolean; feedback: string; correctAnswer: string }>("/quiz/submit", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getWeakPoints: () => request<{ weakPoints: { title: string; wrongCount: number }[] }>("/quiz/weak-points"),

  createClass: (name: string) => request<{ class: { id: string; name: string; code: string } }>("/teacher/classes", {
    method: "POST",
    body: JSON.stringify({ name }),
  }),
  getClasses: () => request<{ classes: { id: string; name: string; code: string }[] }>("/teacher/classes"),
  getClassOverview: (classId: string) =>
    request<{ class: { id: string; name: string; code: string }; students: StudentOverview[] }>(
      `/teacher/classes/${classId}/overview`
    ),
  getStudentDetail: (studentId: string) =>
    request<{
      student: { id: string; name: string; grade: string };
      tasks: Task[];
      weakPoints: { title: string; wrongCount: number }[];
      stress: { level: string; reason: string };
    }>(`/teacher/students/${studentId}`),
};

export type KnowledgePoint = {
  id: string;
  documentId?: string;
  title: string;
  level: string;
  estMinutes: number;
  subject: string;
};

export type Task = {
  id: string;
  date: string;
  type: string;
  title: string;
  knowledgePointId: string | null;
  status: "pending" | "done";
  source: "manual" | "ai";
  minutes: number;
  subject: string;
  time: string | null;
};

export type Question = {
  id: string;
  type: "choice" | "short";
  content: string;
  options: string[] | null;
};

export type StudentOverview = {
  id: string;
  name: string;
  grade: string;
  completionRate: number | null;
  stressLevel: string;
  needsAttention: boolean;
};
