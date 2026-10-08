import { useState, type FormEvent } from "react";
import { api, saveSession, type AuthUser } from "../api";
import { useLang } from "../i18n";
import { LanguageToggle } from "../components/LanguageToggle";

export function AuthScreen({ onAuthed }: { onAuthed: (user: AuthUser) => void }) {
  const { t } = useLang();
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
      <div className="auth-lang-row">
        <LanguageToggle />
      </div>
      <h1>{t("app.title")}</h1>
      <p className="subtitle">{t("app.subtitle")}</p>

      <div className="tabs">
        <button className={role === "student" ? "active" : ""} onClick={() => setRole("student")}>
          {t("auth.roleStudent")}
        </button>
        <button className={role === "teacher" ? "active" : ""} onClick={() => setRole("teacher")}>
          {t("auth.roleTeacher")}
        </button>
      </div>

      <div className="tabs secondary">
        <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
          {t("auth.modeRegister")}
        </button>
        <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
          {t("auth.modeLogin")}
        </button>
      </div>

      <form onSubmit={submit} className="auth-form">
        <label>
          {t("auth.username")}
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        {mode === "register" && (
          <label>
            {t("auth.name")}
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
        )}
        {mode === "register" && role === "student" && (
          <label>
            {t("auth.grade")}
            <input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder={t("auth.gradePlaceholder")} />
          </label>
        )}
        <label>
          {t("auth.password")}
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {mode === "register" && role === "student" && (
          <label>
            {t("auth.classCode")}
            <input value={classCode} onChange={(e) => setClassCode(e.target.value)} placeholder={t("auth.classCodePlaceholder")} />
          </label>
        )}
        {error && <p className="error">{error}</p>}
        <button type="submit" className="primary" disabled={loading}>
          {loading ? t("auth.processing") : mode === "register" ? t("auth.createAccount") : t("auth.login")}
        </button>
      </form>
    </div>
  );
}
