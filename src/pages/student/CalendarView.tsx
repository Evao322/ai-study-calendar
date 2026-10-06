import { useMemo, useState } from "react";
import { api, type Task } from "../../api";
import { subjectColor } from "../../colors";
import {
  addMonths,
  buildMonthGrid,
  formatSelectedDate,
  monthLabel,
  todayKey,
  toKey,
  WEEKDAY_LABELS,
} from "../../dateUtils";
import { TodayIcon, SearchIcon, CalendarIcon, GearIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "../../icons";

const TYPE_LABELS: Record<string, string> = {
  new: "新知",
  review: "複習",
  practice: "練習",
  test: "測驗",
  custom: "自訂",
};

export function CalendarView({
  tasks,
  hasKnowledgePoints,
  onRefresh,
}: {
  tasks: Task[];
  hasKnowledgePoints: boolean;
  onRefresh: () => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchNotFound, setSearchNotFound] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [deadline, setDeadline] = useState("");
  const [dailyMinutes, setDailyMinutes] = useState(90);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const [formDate, setFormDate] = useState(selectedDate);
  const [formTime, setFormTime] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formMinutes, setFormMinutes] = useState(30);
  const [formType, setFormType] = useState("custom");

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const t of tasks) {
      map[t.date] = map[t.date] || [];
      map[t.date].push(t);
    }
    for (const list of Object.values(map)) {
      list.sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
    }
    return map;
  }, [tasks]);

  const grid = useMemo(() => buildMonthGrid(currentMonth), [currentMonth]);
  const selectedTasks = tasksByDate[selectedDate] || [];

  function goToday() {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(todayKey());
  }

  function selectCell(date: Date) {
    const key = toKey(date);
    setSelectedDate(key);
    if (date.getMonth() !== currentMonth.getMonth()) {
      setCurrentMonth(date);
    }
  }

  function runSearch() {
    const q = searchQuery.trim();
    if (!q) return;
    const match = tasks
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .find((t) => t.title.includes(q));
    if (match) {
      const [y, m] = match.date.split("-").map(Number);
      setCurrentMonth(new Date(y, m - 1, 1));
      setSelectedDate(match.date);
      setSearchNotFound(false);
      setShowSearch(false);
    } else {
      setSearchNotFound(true);
    }
  }

  async function toggleDone(task: Task) {
    await api.updateTask(task.id, { status: task.status === "done" ? "pending" : "done" });
    onRefresh();
  }

  async function removeTask(id: string) {
    await api.deleteTask(id);
    onRefresh();
  }

  async function handleReview() {
    if (!deadline) return;
    setBusy(true);
    try {
      const r = await api.reviewPlan(deadline);
      setSuggestions(r.suggestions);
    } finally {
      setBusy(false);
    }
  }

  async function handleAutoGenerate() {
    if (!deadline) return;
    setBusy(true);
    try {
      await api.autoGenerate({ deadlineDate: deadline, dailyMinutes });
      onRefresh();
    } finally {
      setBusy(false);
    }
  }

  function openAddForm() {
    setFormDate(selectedDate);
    setFormTime("");
    setFormSubject("");
    setFormTitle("");
    setFormMinutes(30);
    setFormType("custom");
    setShowAddForm(true);
  }

  async function submitAddForm() {
    if (!formTitle.trim()) return;
    await api.createTask({
      date: formDate,
      type: formType,
      title: formTitle,
      minutes: formMinutes,
      subject: formSubject.trim() || "未分類",
      time: formTime || undefined,
    });
    setShowAddForm(false);
    onRefresh();
  }

  return (
    <div>
      <section className="card cal-card">
        <div className="cal-header">
          <div className="cal-title-group">
            <button className="icon-btn" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))} title="上個月">
              <ChevronLeftIcon />
            </button>
            <h2 className="cal-title">{monthLabel(currentMonth)}</h2>
            <button className="icon-btn" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} title="下個月">
              <ChevronRightIcon />
            </button>
          </div>
          <div className="cal-icons">
            <button className="icon-btn" onClick={goToday} title="回到今天">
              <TodayIcon />
            </button>
            <button className="icon-btn" onClick={() => setShowSearch((v) => !v)} title="搜尋任務">
              <SearchIcon />
            </button>
            <button
              className="icon-btn"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery("");
                setSearchNotFound(false);
              }}
              title="月曆檢視"
            >
              <CalendarIcon />
            </button>
            <button className="icon-btn" onClick={() => setShowSettings((v) => !v)} title="AI 排程設定">
              <GearIcon />
            </button>
          </div>
        </div>

        {showSearch && (
          <div className="search-bar">
            <input
              placeholder="搜尋任務名稱，按 Enter 跳到該日期"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchNotFound(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
            />
            <button onClick={runSearch}>搜尋</button>
            {searchNotFound && <span className="hint">找不到符合的任務</span>}
          </div>
        )}

        {showSettings && (
          <div className="settings-panel">
            <h3>AI 排程設定</h3>
            <div className="row">
              <label>
                截止日期
                <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </label>
              <label>
                每日可學習分鐘
                <input type="number" value={dailyMinutes} onChange={(e) => setDailyMinutes(Number(e.target.value))} />
              </label>
            </div>
            <div className="row">
              <button onClick={handleReview} disabled={busy || !deadline}>
                模式 2：AI 審核目前計劃
              </button>
              <button onClick={handleAutoGenerate} disabled={busy || !deadline || !hasKnowledgePoints}>
                模式 3：AI 全自動排程
              </button>
            </div>
            {!hasKnowledgePoints && <p className="hint">請先到「上傳文件」分頁上傳學習內容，才能使用全自動排程。</p>}
            {suggestions.length > 0 && (
              <div className="suggestions">
                <p>AI 建議：</p>
                <ul>
                  {suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="weekday-row">
          {WEEKDAY_LABELS.map((w) => (
            <div key={w} className="weekday-cell">
              {w}
            </div>
          ))}
        </div>

        <div className="month-grid">
          {grid.map((date) => {
            const key = toKey(date);
            const inMonth = date.getMonth() === currentMonth.getMonth();
            const isToday = key === todayKey();
            const isSelected = key === selectedDate;
            const dayTasks = tasksByDate[key] || [];
            const shown = dayTasks.slice(0, 3);
            const overflow = dayTasks.length - shown.length;

            return (
              <div
                key={key}
                className={[
                  "day-cell",
                  !inMonth ? "muted" : "",
                  isSelected ? "selected" : "",
                  isToday ? "is-today" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => selectCell(date)}
              >
                <span className="day-number">{date.getDate()}</span>
                <div className="day-tags">
                  {shown.map((t) => {
                    const c = subjectColor(t.subject);
                    return (
                      <div
                        key={t.id}
                        className={`day-tag ${t.status === "done" ? "tag-done" : ""}`}
                        style={{ background: c.bg, color: c.text }}
                      >
                        {t.title}
                      </div>
                    );
                  })}
                  {overflow > 0 && <div className="day-tag-more">+{overflow} 更多</div>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <div className="agenda-header">
          <h2>{formatSelectedDate(selectedDate)}</h2>
          <button className="icon-btn" onClick={openAddForm} title="新增任務">
            <PlusIcon />
          </button>
        </div>

        {showAddForm && (
          <div className="add-form">
            <div className="row">
              <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              <input type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} />
              <select value={formType} onChange={(e) => setFormType(e.target.value)}>
                <option value="new">新知</option>
                <option value="review">複習</option>
                <option value="practice">練習</option>
                <option value="test">測驗</option>
                <option value="custom">自訂</option>
              </select>
            </div>
            <div className="row">
              <input placeholder="科目，例如：數學" value={formSubject} onChange={(e) => setFormSubject(e.target.value)} />
              <input placeholder="任務名稱" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
              <input
                type="number"
                value={formMinutes}
                onChange={(e) => setFormMinutes(Number(e.target.value))}
                title="預計分鐘數"
              />
            </div>
            <div className="row">
              <button className="primary" onClick={submitAddForm}>
                新增
              </button>
              <button className="link" onClick={() => setShowAddForm(false)}>
                取消
              </button>
            </div>
          </div>
        )}

        <div className="agenda-list">
          {selectedTasks.length === 0 && <p className="hint">這天還沒有安排任務。</p>}
          {selectedTasks.map((t) => {
            const c = subjectColor(t.subject);
            return (
              <div key={t.id} className={`agenda-card ${t.status === "done" ? "done" : ""}`} style={{ borderLeftColor: c.accent }}>
                <div className="agenda-time">{t.time || `${t.minutes} 分鐘`}</div>
                <div className="agenda-body">
                  <div className="agenda-title">{t.title}</div>
                  <div className="agenda-meta">
                    <span className="subject-chip small" style={{ background: c.bg, color: c.text }}>
                      {t.subject}
                    </span>
                    {TYPE_LABELS[t.type] || t.type}
                  </div>
                </div>
                <input type="checkbox" checked={t.status === "done"} onChange={() => toggleDone(t)} />
                <button className="link danger" onClick={() => removeTask(t.id)}>
                  刪除
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
