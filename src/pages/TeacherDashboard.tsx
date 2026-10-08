import { useEffect, useState } from "react";
import { api, type AuthUser, type StudentOverview, type Task } from "../api";
import { useLang, stressLevelLabel, stressReasonLabel } from "../i18n";
import { LanguageToggle } from "../components/LanguageToggle";

export function TeacherDashboard({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const { t, lang } = useLang();
  const [classes, setClasses] = useState<{ id: string; name: string; code: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentOverview[]>([]);
  const [newClassName, setNewClassName] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{
    student: { id: string; name: string; grade: string };
    tasks: Task[];
    weakPoints: { title: string; wrongCount: number }[];
    stress: { level: string; reason: string };
  } | null>(null);

  async function loadClasses() {
    const r = await api.getClasses();
    setClasses(r.classes);
    if (r.classes.length > 0 && !selectedClassId) setSelectedClassId(r.classes[0].id);
  }

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) loadOverview(selectedClassId);
  }, [selectedClassId]);

  async function loadOverview(classId: string) {
    const r = await api.getClassOverview(classId);
    setStudents(r.students);
  }

  async function createClass() {
    if (!newClassName.trim()) return;
    const r = await api.createClass(newClassName);
    setNewClassName("");
    await loadClasses();
    setSelectedClassId(r.class.id);
  }

  async function openStudent(studentId: string) {
    const detail = await api.getStudentDetail(studentId);
    setSelectedStudent(detail);
  }

  const selectedClass = classes.find((c) => c.id === selectedClassId) || null;

  async function copyClassCode() {
    if (!selectedClass) return;
    try {
      await navigator.clipboard.writeText(selectedClass.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 剪貼簿權限被拒絕時就不特別處理，使用者仍可手動選取文字複製
    }
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>{t("app.title")}</h1>
          <p className="subtitle">
            {user.name}
            {t("nav.teacherSuffix")}
          </p>
        </div>
        <div className="header-actions">
          <LanguageToggle />
          <button onClick={onLogout}>{t("nav.logout")}</button>
        </div>
      </header>

      <section className="card">
        <h2>{t("teacher.classManagement")}</h2>
        <div className="row">
          <input
            placeholder={t("teacher.newClassPlaceholder")}
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
          />
          <button onClick={createClass}>{t("teacher.createClass")}</button>
        </div>

        {classes.length > 0 && (
          <div className="row">
            <select value={selectedClassId || ""} onChange={(e) => setSelectedClassId(e.target.value)}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedClass && (
          <div className="class-code-row">
            <span className="class-code-label">{t("teacher.classCode")}</span>
            <span className="class-code-value">{selectedClass.code}</span>
            <button className="link" onClick={copyClassCode}>
              {copied ? t("teacher.copied") : t("teacher.copy")}
            </button>
          </div>
        )}
      </section>

      <section className="card">
        <h2>{t("teacher.classOverview")}</h2>
        {students.length === 0 && <p className="hint">{t("teacher.noStudentsYet")}</p>}
        {students.length > 0 && (
          <table className="overview-table">
            <thead>
              <tr>
                <th>{t("teacher.colName")}</th>
                <th>{t("teacher.colGrade")}</th>
                <th>{t("teacher.colCompletion")}</th>
                <th>{t("teacher.colStress")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className={s.needsAttention ? "attention" : ""}>
                  <td>{s.name}</td>
                  <td>{s.grade}</td>
                  <td>{s.completionRate === null ? t("teacher.noData") : `${s.completionRate}%`}</td>
                  <td>
                    <span className={`level-tag ${s.stressLevel}`}>{stressLevelLabel(s.stressLevel, lang)}</span>
                    {s.needsAttention && <span className="attention-tag">{t("teacher.needsAttention")}</span>}
                  </td>
                  <td>
                    <button className="link" onClick={() => openStudent(s.id)}>
                      {t("teacher.viewDetails")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {selectedStudent && (
        <div className="modal-backdrop" onClick={() => setSelectedStudent(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t("teacher.studentStatusTitle", { name: selectedStudent.student.name, grade: selectedStudent.student.grade })}</h3>
            <p>
              {t("teacher.stressStatus")}
              <span className={`level-tag ${selectedStudent.stress.level}`}>{stressLevelLabel(selectedStudent.stress.level, lang)}</span>
              　{stressReasonLabel(selectedStudent.stress.reason, lang)}
            </p>

            <h4>{t("teacher.weakPoints")}</h4>
            {selectedStudent.weakPoints.length === 0 ? (
              <p className="hint">{t("teacher.noWeakPoints")}</p>
            ) : (
              <ul>
                {selectedStudent.weakPoints.map((w, i) => (
                  <li key={i}>{t("teacher.wrongTimes", { title: w.title, n: w.wrongCount })}</li>
                ))}
              </ul>
            )}

            <h4>{t("teacher.calendarTasks")}</h4>
            <ul className="student-task-list">
              {selectedStudent.tasks.map((t2, i) => (
                <li key={i} className={t2.status === "done" ? "done" : ""}>
                  {t("teacher.taskLine", { date: t2.date, title: t2.title, n: t2.minutes })}
                </li>
              ))}
              {selectedStudent.tasks.length === 0 && <li className="hint">{t("teacher.noTasks")}</li>}
            </ul>

            <button className="link" onClick={() => setSelectedStudent(null)}>
              {t("common.close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
