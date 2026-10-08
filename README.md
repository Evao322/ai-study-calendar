# AI 智能學習日曆 / AI Smart Study Calendar

**正式網址 / Official Website:** [https://ai-study-calendar.pages.dev](https://ai-study-calendar.pages.dev)

（Cloudflare Pages + D1, 任何人都可以用這個網址直接使用 / Anyone can directly access and use this URL）

---

## 中文版 (Traditional Chinese)

### 以後怎麼發布新版本

1. 在這個資料夾改程式碼、測試沒問題後。
2. 執行 `npm run pages:deploy`（會自動建置並部署到上面的正式網址）。
3. 想順便更新 GitHub 存檔的話，再執行 `git add -A`、`git commit`、`git push`。

---

### 開發中：核心功能初型（本機測試說明）

這是學生端 + 教師端的第一個可以實際操作的初型，已經可以跑完「上傳文件 → AI 拆解知識點 → 日曆規劃（三種模式） → AI 出題測驗 → 老師後台監看」的完整流程。

#### 怎麼在自己的電腦上打開測試

這個初型分成兩個部分，需要同時啟動：

1. **後端（資料與 AI 處理）**
* 開一個終端機視窗，切換到 `server` 資料夾：`cd server`
* 第一次使用先執行 `npm install`
* 執行 `npm run dev`，看到「本機後端已啟動」就代表成功（會佔用 8787 這個埠號）


2. **前端（網頁畫面）**
* 另開一個終端機視窗，留在最上層的專案資料夾
* 第一次使用先執行 `npm install`
* 執行 `npm run dev`
* 瀏覽器打開終端機顯示的網址（通常是 `http://localhost:5173`）



#### 怎麼測試（建議流程）

1. 選「我是老師」→「註冊新帳號」，建立一個老師帳號，再建立一個班級，記下班級碼。
2. 登出，選「我是學生」→「註冊新帳號」，註冊時填入剛剛的班級碼。
3. 在學生畫面貼上一段課本文字，按「上傳並解析」，確認 AI 有拆解出知識點。
4. 試試看三種日曆規劃模式：手動新增任務、AI 審核目前計劃、AI 全自動排程。
5. 點任一知識點的「出題練習」，作答後確認會顯示批改結果。
6. 登出並用老師帳號登入，確認班級總覽能看到剛剛那位學生的完成率、壓力狀態，點「查看詳情」能看到完整日曆。

#### 目前已完成 / 尚未完成

**已完成：**

* 師生雙端註冊登入、班級碼機制
* 文件上傳（PDF、PowerPoint .pptx，或直接貼文字）→ AI 拆解知識點（Gemini，失敗時有備用邏輯，不會整個壞掉）
* 三種日曆規劃模式（手動、AI 審核、AI 全自動排程，依艾賓浩斯曲線安排複習）
* AI 出題（根據上傳文件的原文內容出題，確保有複習價值）與批改、薄弱知識點統計
* 學習壓力監測（輕鬆／正常／偏高／過載）
* 老師端全班總覽、個別學生詳情
* 已部署到 Cloudflare 正式上線

**尚未完成（後續階段）：**

* 舊版 .doc / .ppt（非 .docx/.pptx）格式尚不支援
* 連續多天壓力過高時，自動通知老師的即時提醒（目前資料庫有記錄，但還沒有主動通知介面）
* 多學科獨立管理
* 商用收費機制

#### 學習壓力等級判定條件

系統看學生「最近 3 天」（含今天）的任務資料，依兩個指標判斷：

| 指標 | 定義 |
|---|---|
| 過載天數 | 這 3 天中，有幾天「當天安排的總分鐘數 > 240 分鐘」 |
| 完成率 | 只算**已經過去的日子**（不含今天）已完成任務 ÷ 總任務數 |

判定順序（由高到低）：

| 等級 | 條件 |
|---|---|
| 🔴 過載 | 過載天數 ≥ 2 天，**或** 完成率 < 40% |
| 🟠 偏高 | 過載天數 ≥ 1 天，**或** 完成率 < 60% |
| 🟢 輕鬆 | 沒有過載、完成率正常，且**今天**安排的時間 > 0 且 < 60 分鐘 |
| 🔵 正常 | 以上皆不符合（含完全沒有任務時的預設值） |

#### 資料儲存

目前使用本機檔案 `server/data.db` 儲存所有資料（學生、老師、班級、任務、題目等），刪除這個檔案會清空所有測試資料。

---

## English Version

### How to Deploy New Versions

1. Modify the code in this directory and verify everything works.
2. Run `npm run pages:deploy` (it will automatically build and deploy to the official site URL above).
3. To update your GitHub repository, run `git add -A`, `git commit`, and `git push`.

---

### Under Development: Core Functional Prototype (Local Testing Guide)

This is the initial working prototype featuring both student and teacher portals. It supports the full workflow: "Upload Document → AI Knowledge Point Extraction → Calendar Planning (3 Modes) → AI Quiz Generation → Teacher Dashboard Monitoring".

#### How to Run Local Tests

This prototype consists of two parts that must be started simultaneously:

1. **Backend (Data & AI Processing)**
* Open a terminal window and navigate to the `server` directory: `cd server`
* Run `npm install` for the initial setup.
* Run `npm run dev`. Seeing "Local backend started" indicates success (occupies port 8787).


2. **Frontend (User Interface)**
* Open another terminal window and stay in the root project directory.
* Run `npm install` for the initial setup.
* Run `npm run dev`.
* Open the URL displayed in the terminal in your browser (typically `http://localhost:5173`).



#### Recommended Test Workflow

1. Select "I am a Teacher" → "Register", create a teacher account, create a class, and note down the class code.
2. Log out, select "I am a Student" → "Register", and enter the class code during registration.
3. On the student interface, paste textbook text, click "Upload and Parse", and confirm that the AI extracts knowledge points.
4. Try the three calendar planning modes: Manual task creation, AI plan review, and AI fully automated scheduling.
5. Click "Practice Quiz" for any knowledge point, submit answers, and check the automated grading results.
6. Log out and log back in as the teacher. Verify that the class overview displays the student's completion rate and stress status, and click "View Details" to inspect their full calendar.

#### Completed & Pending Features

**Completed:**

* Dual-ended student/teacher registration and authentication via class codes.
* Document uploading (PDF, PowerPoint `.pptx`, or direct text input) with AI knowledge point extraction (powered by Gemini, featuring fallback logic to prevent hard crashes).
* Three calendar planning modes (Manual, AI Review, and AI Auto-Scheduling based on the Ebbinghaus forgetting curve).
* AI quiz generation (tailored to source content for actual revision value) with automated grading and weak point tracking.
* Study stress level monitoring (Light / Normal / High / Overload).
* Teacher dashboard for class-wide monitoring and individual student drill-down views.
* Live deployment on Cloudflare Pages.

**Pending (Upcoming Stages):**

* Support for legacy document formats like `.doc` and `.ppt` (non-`.docx`/`.pptx`).
* Automated teacher alerts for consecutive days of extreme student stress (currently recorded in the database, but lacking a real-time notification interface).
* Multi-subject independent management.
* Commercial monetization mechanisms.

#### Stress Level Criteria

The system looks at a student's task data over the **last 3 days** (including today), using two metrics:

| Metric | Definition |
|---|---|
| Overload days | Out of those 3 days, how many had more than 240 total minutes scheduled |
| Completion rate | Completed tasks ÷ total tasks, counted only over **past** days (today is excluded, since it isn't over yet) |

Evaluated in this order (highest severity first):

| Level | Condition |
|---|---|
| 🔴 Overloaded | Overload days ≥ 2, **or** completion rate < 40% |
| 🟠 Elevated | Overload days ≥ 1, **or** completion rate < 60% |
| 🟢 Light | No overload, normal completion rate, **and** today's scheduled time is > 0 and < 60 minutes |
| 🔵 Normal | None of the above apply (also the default when there are no tasks at all) |

#### Data Storage

All data (students, teachers, classes, tasks, quizzes, etc.) is currently stored in a local SQLite file at `server/data.db`. Deleting this file will reset all test data.
