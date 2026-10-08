import { useMemo, useState } from "react";
import { api, type Task } from "../../api";
import { subjectColor } from "../../colors";
import { addMonths, buildMonthGrid, formatSelectedDate, monthLabel, todayKey, toKey, weekdayLabels } from "../../dateUtils";
import { TodayIcon, SearchIcon, CalendarIcon, GearIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "../../icons";
import { useLang, subjectLabel, taskTypeLabel } from "../../i18n";

export function CalendarView({
  tasks,
  hasKnowledgePoints,
  onRefresh,
}: {
  tasks: Task[];
  hasKnowledgePoints: boolean;
  onRefresh: () => void;
}) {
  const { t, lang } = useLang();
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
    for (const task of tasks) {
      map[task.date] = map[task.date] || [];
      map[task.date].push(task);
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
      .find((task) => task.title.includes(q));
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
            <button className="icon-btn" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))} title={t("cal.prevMonth")}>
              <ChevronLeftIcon />
            </button>
            <h2 className="cal-title">{monthLabel(currentMonth, lang)}</h2>
            <button className="icon-btn" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} title={t("cal.nextMonth")}>
              <ChevronRightIcon />
            </button>
          </div>
          <div className="cal-icons">
            <button className="icon-btn" onClick={goToday} title={t("cal.backToToday")}>
              <TodayIcon />
            </button>
            <button className="icon-btn" onClick={() => setShowSearch((v) => !v)} title={t("cal.searchTasks")}>
              <SearchIcon />
            </button>
            <button
              className="icon-btn"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery("");
                setSearchNotFound(false);
              }}
              title={t("cal.monthView")}
            >
              <CalendarIcon />
            </button>
            <button className="icon-btn" onClick={() => setShowSettings((v) => !v)} title={t("cal.aiSettings")}>
              <GearIcon />
            </button>
          </div>
        </div>

        {showSearch && (
          <div className="search-bar">
            <input
              placeholder={t("cal.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchNotFound(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
            />
            <button onClick={runSearch}>{t("cal.search")}</button>
            {searchNotFound && <span className="hint">{t("cal.noMatch")}</span>}
          </div>
        )}

        {showSettings && (
          <div className="settings-panel">
            <h3>{t("cal.aiSettings")}</h3>
            <div className="row">
              <label>
                {t("cal.deadline")}
                <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </label>
              <label>
                {t("cal.dailyMinutes")}
                <input type="number" value={dailyMinutes} onChange={(e) => setDailyMinutes(Number(e.target.value))} />
              </label>
            </div>
            <div className="row">
              <button onClick={handleReview} disabled={busy || !deadline}>
                {t("cal.mode2")}
              </button>
              <button onClick={handleAutoGenerate} disabled={busy || !deadline || !hasKnowledgePoints}>
                {t("cal.mode3")}
              </button>
            </div>
            {!hasKnowledgePoints && <p className="hint">{t("cal.needUploadFirst")}</p>}
            {suggestions.length > 0 && (
              <div className="suggestions">
                <p>{t("cal.aiSuggestions")}</p>
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
          {weekdayLabels(lang).map((w) => (
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
                  {shown.map((dt) => {
                    const c = subjectColor(dt.subject);
                    return (
                      <div
                        key={dt.id}
                        className={`day-tag ${dt.status === "done" ? "tag-done" : ""}`}
                        style={{ background: c.bg, color: c.text }}
                      >
                        {dt.title}
                      </div>
                    );
                  })}
                  {overflow > 0 && <div className="day-tag-more">{t("cal.more", { n: overflow })}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <div className="agenda-header">
          <h2>{formatSelectedDate(selectedDate, lang)}</h2>
          <button className="icon-btn" onClick={openAddForm} title={t("cal.addTask")}>
            <PlusIcon />
          </button>
        </div>

        {showAddForm && (
          <div className="add-form">
            <div className="row">
              <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              <input type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} />
              <select value={formType} onChange={(e) => setFormType(e.target.value)}>
                <option value="new">{taskTypeLabel("new", lang)}</option>
                <option value="review">{taskTypeLabel("review", lang)}</option>
                <option value="practice">{taskTypeLabel("practice", lang)}</option>
                <option value="test">{taskTypeLabel("test", lang)}</option>
                <option value="custom">{taskTypeLabel("custom", lang)}</option>
              </select>
            </div>
            <div className="row">
              <input placeholder={t("cal.taskSubjectPlaceholder")} value={formSubject} onChange={(e) => setFormSubject(e.target.value)} />
              <input placeholder={t("cal.taskNamePlaceholder")} value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
              <input
                type="number"
                value={formMinutes}
                onChange={(e) => setFormMinutes(Number(e.target.value))}
                title={t("cal.estimatedMinutes")}
              />
            </div>
            <div className="row">
              <button className="primary" onClick={submitAddForm}>
                {t("cal.add")}
              </button>
              <button className="link" onClick={() => setShowAddForm(false)}>
                {t("cal.cancel")}
              </button>
            </div>
          </div>
        )}

        <div className="agenda-list">
          {selectedTasks.length === 0 && <p className="hint">{t("cal.noTasksToday")}</p>}
          {selectedTasks.map((t2) => {
            const c = subjectColor(t2.subject);
            return (
              <div key={t2.id} className={`agenda-card ${t2.status === "done" ? "done" : ""}`} style={{ borderLeftColor: c.accent }}>
                <div className="agenda-time">{t2.time || t("cal.minutesShort", { n: t2.minutes })}</div>
                <div className="agenda-body">
                  <div className="agenda-title">{t2.title}</div>
                  <div className="agenda-meta">
                    <span className="subject-chip small" style={{ background: c.bg, color: c.text }}>
                      {subjectLabel(t2.subject, lang)}
                    </span>
                    {taskTypeLabel(t2.type, lang)}
                  </div>
                </div>
                <input type="checkbox" checked={t2.status === "done"} onChange={() => toggleDone(t2)} />
                <button className="link danger" onClick={() => removeTask(t2.id)}>
                  {t("cal.delete")}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
