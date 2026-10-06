export type Env = {
  DB: D1Database;
  GEMINI_API_KEY?: string;
  JWT_SECRET?: string;
};

export type AuthVars = {
  user: { id: string; role: "student" | "teacher"; name: string };
};
