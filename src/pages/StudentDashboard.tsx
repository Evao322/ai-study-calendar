import { useEffect, useState } from "react";
import { api, type AuthUser, type KnowledgePoint, type Task } from "../api";
import { UploadTab } from "./student/UploadTab";
import { CalendarView } from "./student/CalendarView";
import { QuizModal } from "./student/QuizModal";

export function StudentDashboard({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
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
          <h1>AI 智能學習日曆</h1>
          <p className="subtitle">
            {user.name}（學生）{user.grade ? ` · ${user.grade}` : ""}
          </p>
        </div>
        <button onClick={onLogout}>登出</button>
      </header>

      {stress && (
        <div className={`stress-banner level-${stress.level}`}>
          學習壓力：{stress.level} — {stress.reason}
        </div>
      )}

      <div className="tab-bar">
        <button className={tab === "upload" ? "active" : ""} onClick={() => setTab("upload")}>
          上傳文件
        </button>
        <button className={tab === "calendar" ? "active" : ""} onClick={() => setTab("calendar")}>
          日曆管理
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
