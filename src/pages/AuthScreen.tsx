import { useState, type FormEvent } from "react";
import { api, saveSession, type AuthUser } from "../api";
import { useLanguage } from "../i18n";
import { LanguageToggle } from "../LanguageToggle";

export function AuthScreen({ onAuthed }: { onAuthed: (user: AuthUser) => void }) {
  const { t } = useLanguage();
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
      <LanguageToggle />
      <h1>{t("appTitle")}</h1>
      <p className="subtitle">{t("authSubtitle")}</p>

      <div className="tabs">
        <button className={role === "student" ? "active" : ""} onClick={() => setRole("student")}>
          {t("roleStudent")}
        </button>
        <button className={role === "teacher" ? "active" : ""} onClick={() => setRole("teacher")}>
          {t("roleTeacher")}
        </button>
      </div>

      <div className="tabs secondary">
        <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
          {t("modeRegister")}
        </button>
        <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
          {t("modeLogin")}
        </button>
      </div>

      <form onSubmit={submit} className="auth-form">
        <label>
          {t("fieldUsername")}
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        {mode === "register" && (
          <label>
            {t("fieldName")}
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
        )}
        {mode === "register" && role === "student" && (
          <label>
            {t("fieldGrade")}
            <input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder={t("fieldGradePlaceholder")} />
          </label>
        )}
        <label>
          {t("fieldPassword")}
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {mode === "register" && role === "student" && (
          <label>
            {t("fieldClassCode")}
            <input value={classCode} onChange={(e) => setClassCode(e.target.value)} placeholder={t("fieldClassCodePlaceholder")} />
          </label>
        )}
        {error && <p className="error">{error}</p>}
        <button type="submit" className="primary" disabled={loading}>
          {loading ? t("submitting") : mode === "register" ? t("submitCreate") : t("submitLogin")}
        </button>
      </form>
    </div>
  );
}
