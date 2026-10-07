import { useEffect, useState } from "react";
import { api, type AuthUser, type StudentOverview, type Task } from "../api";
import { translateLabel, useLanguage } from "../i18n";
import { LanguageToggle } from "../LanguageToggle";
import { CheckIcon, CopyIcon } from "../icons";

export function TeacherDashboard({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const { t } = useLanguage();
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

  const selectedClass = classes.find((c) => c.id === selectedClassId) || null;

  async function copyClassCode() {
    if (!selectedClass) return;
    try {
      await navigator.clipboard.writeText(selectedClass.code);
    } catch {
      // clipboard API unavailable; fail silently, button simply won't confirm
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

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

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>{t("appTitle")}</h1>
          <p className="subtitle">
            {user.name}
            {t("teacherSuffix")}
          </p>
        </div>
        <div className="row" style={{ margin: 0 }}>
          <LanguageToggle />
          <button onClick={onLogout}>{t("logout")}</button>
        </div>
      </header>

      <section className="card">
        <h2>{t("classManagement")}</h2>
        <div className="row">
          <input
            placeholder={t("newClassPlaceholder")}
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
          />
          <button onClick={createClass}>{t("createClass")}</button>
        </div>

        {classes.length > 0 && (
          <div className="row">
            <select
              value={selectedClassId || ""}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setCopied(false);
              }}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}（{t("classCodeLabel")}：{c.code}）
                </option>
              ))}
            </select>
            {selectedClass && (
              <div className="class-code-row">
                <span className="hint">
                  {t("classCodeLabel")}：<strong>{selectedClass.code}</strong>
                </span>
                <button className={`copy-code-btn ${copied ? "copied" : ""}`} onClick={copyClassCode}>
                  {copied ? <CheckIcon /> : <CopyIcon />}
                  {copied ? t("copiedCode") : t("copyCode")}
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="card">
        <h2>{t("classOverview")}</h2>
        {students.length === 0 && <p className="hint">{t("noStudentsHint")}</p>}
        {students.length > 0 && (
          <table className="overview-table">
            <thead>
              <tr>
                <th>{t("colName")}</th>
                <th>{t("colGrade")}</th>
                <th>{t("colCompletion")}</th>
                <th>{t("colStress")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className={s.needsAttention ? "attention" : ""}>
                  <td>{s.name}</td>
                  <td>{s.grade}</td>
                  <td>{s.completionRate === null ? t("noData") : `${s.completionRate}%`}</td>
                  <td>
                    <span className={`level-tag ${s.stressLevel}`}>{translateLabel(t, s.stressLevel)}</span>
                    {s.needsAttention && <span className="attention-tag">{t("needsAttention")}</span>}
                  </td>
                  <td>
                    <button className="link" onClick={() => openStudent(s.id)}>
                      {t("viewDetails")}
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
            <h3>
              {selectedStudent.student.name} {t("studentSuffix")}（{selectedStudent.student.grade}）
            </h3>
            <p>
              {t("stressLabel")}
              <span className={`level-tag ${selectedStudent.stress.level}`}>
                {translateLabel(t, selectedStudent.stress.level)}
              </span>
              　{selectedStudent.stress.reason}
            </p>

            <h4>{t("weakPoints")}</h4>
            {selectedStudent.weakPoints.length === 0 ? (
              <p className="hint">{t("noWeakPoints")}</p>
            ) : (
              <ul>
                {selectedStudent.weakPoints.map((w, i) => (
                  <li key={i}>
                    {w.title} — {t("wrongCount", { n: w.wrongCount })}
                  </li>
                ))}
              </ul>
            )}

            <h4>{t("calendarTasks")}</h4>
            <ul className="student-task-list">
              {selectedStudent.tasks.map((t2, i) => (
                <li key={i} className={t2.status === "done" ? "done" : ""}>
                  {t2.date} · {t2.title}（{t2.minutes} {t("minutesSuffix")}）
                </li>
              ))}
              {selectedStudent.tasks.length === 0 && <li className="hint">{t("noTasks")}</li>}
            </ul>

            <button className="link" onClick={() => setSelectedStudent(null)}>
              {t("close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
