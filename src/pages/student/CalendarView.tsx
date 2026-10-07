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
  weekdayLabels,
} from "../../dateUtils";
import { TodayIcon, SearchIcon, CalendarIcon, GearIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "../../icons";
import { useLanguage, type TKey } from "../../i18n";

const TYPE_LABEL_KEYS: Record<string, TKey> = {
  new: "taskTypeNew",
  review: "taskTypeReview",
  practice: "taskTypePractice",
  test: "taskTypeTest",
  custom: "taskTypeCustom",
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
  const { t, lang } = useLanguage();
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
      subject: formSubject.trim() || t("unclassifiedSubject"),
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
            <button className="icon-btn" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))} title={t("prevMonth")}>
              <ChevronLeftIcon />
            </button>
            <h2 className="cal-title">{monthLabel(currentMonth, lang)}</h2>
            <button className="icon-btn" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} title={t("nextMonth")}>
              <ChevronRightIcon />
            </button>
          </div>
          <div className="cal-icons">
            <button className="icon-btn" onClick={goToday} title={t("backToToday")}>
              <TodayIcon />
            </button>
            <button className="icon-btn" onClick={() => setShowSearch((v) => !v)} title={t("searchTasks")}>
              <SearchIcon />
            </button>
            <button
              className="icon-btn"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery("");
                setSearchNotFound(false);
              }}
              title={t("calendarViewTitle")}
            >
              <CalendarIcon />
            </button>
            <button className="icon-btn" onClick={() => setShowSettings((v) => !v)} title={t("aiSettingsTitle")}>
              <GearIcon />
            </button>
          </div>
        </div>

        {showSearch && (
          <div className="search-bar">
            <input
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchNotFound(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
            />
            <button onClick={runSearch}>{t("searchButton")}</button>
            {searchNotFound && <span className="hint">{t("searchNotFound")}</span>}
          </div>
        )}

        {showSettings && (
          <div className="settings-panel">
            <h3>{t("aiSettingsTitle")}</h3>
            <div className="row">
              <label>
                {t("deadlineLabel")}
                <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </label>
              <label>
                {t("dailyMinutesLabel")}
                <input type="number" value={dailyMinutes} onChange={(e) => setDailyMinutes(Number(e.target.value))} />
              </label>
            </div>
            <div className="row">
              <button onClick={handleReview} disabled={busy || !deadline}>
                {t("mode2Button")}
              </button>
              <button onClick={handleAutoGenerate} disabled={busy || !deadline || !hasKnowledgePoints}>
                {t("mode3Button")}
              </button>
            </div>
            {!hasKnowledgePoints && <p className="hint">{t("needKpHint")}</p>}
            {suggestions.length > 0 && (
              <div className="suggestions">
                <p>{t("aiSuggestions")}</p>
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
                  {shown.map((task) => {
                    const c = subjectColor(task.subject);
                    return (
                      <div
                        key={task.id}
                        className={`day-tag ${task.status === "done" ? "tag-done" : ""}`}
                        style={{ background: c.bg, color: c.text }}
                      >
                        {task.title}
                      </div>
                    );
                  })}
                  {overflow > 0 && <div className="day-tag-more">{t("moreCount", { n: overflow })}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <div className="agenda-header">
          <h2>{formatSelectedDate(selectedDate, lang)}</h2>
          <button className="icon-btn" onClick={openAddForm} title={t("addTaskTitle")}>
            <PlusIcon />
          </button>
        </div>

        {showAddForm && (
          <div className="add-form">
            <div className="row">
              <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              <input type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} />
              <select value={formType} onChange={(e) => setFormType(e.target.value)}>
                <option value="new">{t("taskTypeNew")}</option>
                <option value="review">{t("taskTypeReview")}</option>
                <option value="practice">{t("taskTypePractice")}</option>
                <option value="test">{t("taskTypeTest")}</option>
                <option value="custom">{t("taskTypeCustom")}</option>
              </select>
            </div>
            <div className="row">
              <input placeholder={t("subjectPlaceholder")} value={formSubject} onChange={(e) => setFormSubject(e.target.value)} />
              <input placeholder={t("taskTitlePlaceholder")} value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
              <input
                type="number"
                value={formMinutes}
                onChange={(e) => setFormMinutes(Number(e.target.value))}
                title={t("minutesTitle")}
              />
            </div>
            <div className="row">
              <button className="primary" onClick={submitAddForm}>
                {t("add")}
              </button>
              <button className="link" onClick={() => setShowAddForm(false)}>
                {t("cancel")}
              </button>
            </div>
          </div>
        )}

        <div className="agenda-list">
          {selectedTasks.length === 0 && <p className="hint">{t("noTaskForDay")}</p>}
          {selectedTasks.map((task) => {
            const c = subjectColor(task.subject);
            return (
              <div
                key={task.id}
                className={`agenda-card ${task.status === "done" ? "done" : ""}`}
                style={{ borderLeftColor: c.accent }}
              >
                <div className="agenda-time">{task.time || `${task.minutes} ${t("minutesSuffix")}`}</div>
                <div className="agenda-body">
                  <div className="agenda-title">{task.title}</div>
                  <div className="agenda-meta">
                    <span className="subject-chip small" style={{ background: c.bg, color: c.text }}>
                      {task.subject}
                    </span>
                    {TYPE_LABEL_KEYS[task.type] ? t(TYPE_LABEL_KEYS[task.type]) : task.type}
                  </div>
                </div>
                <input type="checkbox" checked={task.status === "done"} onChange={() => toggleDone(task)} />
                <button className="link danger" onClick={() => removeTask(task.id)}>
                  {t("delete")}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
