import { useEffect, useState } from "react";
import { api, type AuthUser, type KnowledgePoint, type Task } from "../api";
import { UploadTab } from "./student/UploadTab";
import { CalendarView } from "./student/CalendarView";
import { QuizModal } from "./student/QuizModal";
import { translateLabel, useLanguage } from "../i18n";
import { LanguageToggle } from "../LanguageToggle";

export function StudentDashboard({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<"upload" | "calendar">("upload");
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stress, setStress] = useState<{ level: string; reason: string } | null>(null);
  const [weakPoints, setWeakPoints] = useState<{ title: string; wrongCount: number }[]>([]);
  const [quizForKp, setQuizForKp] = useState<KnowledgePoint | null>(null);

  async function refreshAll() {
    const [kp, t, s, w] = await Promise.all([
      api.getKnowledgePoints(),
      api.getTasks(),
      api.getStress(),
      api.getWeakPoints(),
    ]);
    setKnowledgePoints(kp.knowledgePoints);
    setTasks(t.tasks);
    setStress(s);
    setWeakPoints(w.weakPoints);
  }

  useEffect(() => {
    refreshAll();
  }, []);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>{t("appTitle")}</h1>
          <p className="subtitle">
            {user.name}
            {t("studentSuffix")}
            {user.grade ? ` · ${user.grade}` : ""}
          </p>
        </div>
        <div className="row" style={{ margin: 0 }}>
          <LanguageToggle />
          <button onClick={onLogout}>{t("logout")}</button>
        </div>
      </header>

      {stress && (
        <div className={`stress-banner level-${stress.level}`}>
          {t("stressBannerLabel")}
          {translateLabel(t, stress.level)} — {stress.reason}
        </div>
      )}

      <div className="tab-bar">
        <button className={tab === "upload" ? "active" : ""} onClick={() => setTab("upload")}>
          {t("tabUpload")}
        </button>
        <button className={tab === "calendar" ? "active" : ""} onClick={() => setTab("calendar")}>
          {t("tabCalendar")}
        </button>
      </div>

      {tab === "upload" ? (
        <UploadTab
          knowledgePoints={knowledgePoints}
          weakPoints={weakPoints}
          onUploaded={refreshAll}
          onOpenQuiz={setQuizForKp}
        />
      ) : (
        <CalendarView tasks={tasks} hasKnowledgePoints={knowledgePoints.length > 0} onRefresh={refreshAll} />
      )}

      {quizForKp && <QuizModal knowledgePoint={quizForKp} onClose={() => setQuizForKp(null)} onFinished={refreshAll} />}
    </div>
  );
}
