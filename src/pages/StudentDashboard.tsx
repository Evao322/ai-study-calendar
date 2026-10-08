import { useEffect, useState } from "react";
import { api, type AuthUser, type KnowledgePoint, type Task } from "../api";
import { UploadTab } from "./student/UploadTab";
import { CalendarView } from "./student/CalendarView";
import { QuizModal } from "./student/QuizModal";
import { useLang, stressLevelLabel, stressReasonLabel } from "../i18n";
import { LanguageToggle } from "../components/LanguageToggle";

export function StudentDashboard({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const { t, lang } = useLang();
  const [tab, setTab] = useState<"upload" | "calendar">("upload");
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stress, setStress] = useState<{ level: string; reason: string } | null>(null);
  const [weakPoints, setWeakPoints] = useState<{ title: string; wrongCount: number }[]>([]);
  const [quizForKp, setQuizForKp] = useState<KnowledgePoint | null>(null);

  async function refreshAll() {
    const [kp, taskList, s, w] = await Promise.all([
      api.getKnowledgePoints(),
      api.getTasks(),
      api.getStress(),
      api.getWeakPoints(),
    ]);
    setKnowledgePoints(kp.knowledgePoints);
    setTasks(taskList.tasks);
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
          <h1>{t("app.title")}</h1>
          <p className="subtitle">
            {user.name}
            {t("nav.studentSuffix")}
            {user.grade ? ` · ${user.grade}` : ""}
          </p>
        </div>
        <div className="header-actions">
          <LanguageToggle />
          <button onClick={onLogout}>{t("nav.logout")}</button>
        </div>
      </header>

      {stress && (
        <div className={`stress-banner level-${stress.level}`}>
          {t("student.stressPrefix")}
          {stressLevelLabel(stress.level, lang)} — {stressReasonLabel(stress.reason, lang)}
        </div>
      )}

      <div className="tab-bar">
        <button className={tab === "upload" ? "active" : ""} onClick={() => setTab("upload")}>
          {t("student.tabUpload")}
        </button>
        <button className={tab === "calendar" ? "active" : ""} onClick={() => setTab("calendar")}>
          {t("student.tabCalendar")}
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
