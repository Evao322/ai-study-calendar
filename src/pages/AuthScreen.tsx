import { useState, type FormEvent } from "react";
import { api, saveSession, type AuthUser } from "../api";

export function AuthScreen({ onAuthed }: { onAuthed: (user: AuthUser) => void }) {
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [mode, setMode] = useState<"login" | "register">("register");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [password, setPassword] = useState("");
  const [classCode, setClassCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let result;
      if (role === "teacher") {
        result = mode === "register"
          ? await api.registerTeacher({ username, name, password })
          : await api.loginTeacher({ username, password });
      } else {
        result = mode === "register"
          ? await api.registerStudent({ username, name, grade, password, classCode })
          : await api.loginStudent({ username, password });
      }
      saveSession(result.token, result.user);
      onAuthed(result.user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <h1>AI 智能學習日曆</h1>
      <p className="subtitle">師生雙端 AI 智能學習管理工具</p>

      <div className="tabs">
        <button className={role === "student" ? "active" : ""} onClick={() => setRole("student")}>
          我是學生
        </button>
        <button className={role === "teacher" ? "active" : ""} onClick={() => setRole("teacher")}>
          我是老師
        </button>
      </div>

      <div className="tabs secondary">
        <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
          註冊新帳號
        </button>
        <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
          登入
        </button>
      </div>

      <form onSubmit={submit} className="auth-form">
        <label>
          帳號
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        {mode === "register" && (
          <label>
            姓名
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
        )}
        {mode === "register" && role === "student" && (
          <label>
            年級
            <input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="例如：五年級" />
          </label>
        )}
        <label>
          密碼
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {mode === "register" && role === "student" && (
          <label>
            班級碼（選填，老師會提供）
            <input value={classCode} onChange={(e) => setClassCode(e.target.value)} placeholder="例如：CAB4DS" />
          </label>
        )}
        {error && <p className="error">{error}</p>}
        <button type="submit" className="primary" disabled={loading}>
          {loading ? "處理中..." : mode === "register" ? "建立帳號" : "登入"}
        </button>
      </form>
    </div>
  );
}
