import { useEffect, useState } from "react";
import { api, type AuthUser, type StudentOverview, type Task } from "../api";

export function TeacherDashboard({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [classes, setClasses] = useState<{ id: string; name: string; code: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentOverview[]>([]);
  const [newClassName, setNewClassName] = useState("");
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

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>AI 智能學習日曆</h1>
          <p className="subtitle">{user.name}（老師）</p>
        </div>
        <button onClick={onLogout}>登出</button>
      </header>

      <section className="card">
        <h2>班級管理</h2>
        <div className="row">
          <input placeholder="新班級名稱，例如：五年一班" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} />
          <button onClick={createClass}>建立班級</button>
        </div>

        {classes.length > 0 && (
          <div className="row">
            <select value={selectedClassId || ""} onChange={(e) => setSelectedClassId(e.target.value)}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}（班級碼：{c.code}）
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      <section className="card">
        <h2>全班學情總覽</h2>
        {students.length === 0 && <p className="hint">目前這個班級還沒有學生加入。請把班級碼交給學生，讓他們註冊時填入。</p>}
        {students.length > 0 && (
          <table className="overview-table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>年級</th>
                <th>近 7 天完成率</th>
                <th>壓力狀態</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className={s.needsAttention ? "attention" : ""}>
                  <td>{s.name}</td>
                  <td>{s.grade}</td>
                  <td>{s.completionRate === null ? "尚無資料" : `${s.completionRate}%`}</td>
                  <td>
                    <span className={`level-tag ${s.stressLevel}`}>{s.stressLevel}</span>
                    {s.needsAttention && <span className="attention-tag">需要關注</span>}
                  </td>
                  <td>
                    <button className="link" onClick={() => openStudent(s.id)}>
                      查看詳情
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
              {selectedStudent.student.name} 的學習狀況（{selectedStudent.student.grade}）
            </h3>
            <p>
              壓力狀態：<span className={`level-tag ${selectedStudent.stress.level}`}>{selectedStudent.stress.level}</span>
              　{selectedStudent.stress.reason}
            </p>

            <h4>薄弱知識點</h4>
            {selectedStudent.weakPoints.length === 0 ? (
              <p className="hint">目前沒有明顯的薄弱知識點。</p>
            ) : (
              <ul>
                {selectedStudent.weakPoints.map((w, i) => (
                  <li key={i}>
                    {w.title} — 錯了 {w.wrongCount} 次
                  </li>
                ))}
              </ul>
            )}

            <h4>日曆任務</h4>
            <ul className="student-task-list">
              {selectedStudent.tasks.map((t, i) => (
                <li key={i} className={t.status === "done" ? "done" : ""}>
                  {t.date} · {t.title}（{t.minutes} 分）
                </li>
              ))}
              {selectedStudent.tasks.length === 0 && <li className="hint">尚無任務</li>}
            </ul>

            <button className="link" onClick={() => setSelectedStudent(null)}>
              關閉
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
