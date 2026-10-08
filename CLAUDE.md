# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

AI 智能學習日曆 (AI Study Calendar) — a student/teacher learning-management web app. Students upload course material (PDF/PPTX/pasted text), Gemini extracts knowledge points, students plan study schedules (manual, AI-reviewed, or fully AI-generated using spaced repetition), take AI-generated quizzes grounded in the uploaded material, and a stress heuristic flags overload. Teachers manage classes via a join code and monitor student progress/stress.

Live production: https://ai-study-calendar.pages.dev

## Architecture: two parallel backends, one frontend

This repo has **two independent backend implementations of the same API** that must be kept in sync manually — there is no shared backend code:

- **`functions/`** — Cloudflare Pages Functions (Hono + D1), used for **production**. Entry point is `functions/api/[[route]].ts`, a catch-all that delegates to the Hono app in `functions/_lib/app.ts`. All business logic lives in `functions/_lib/*.ts`.
- **`server/`** — a local Express + `node:sqlite` server, used for **local development only** (not deployed). It has its own `package.json`/`node_modules` and mirrors the same routes/logic in plain JS (`server/routes/*.js`, `server/*.js`).

When changing behavior (auth, document parsing, scheduling, quiz generation, stress calc), **update both** `functions/_lib/` (TS) and `server/` (JS) — they are hand-synced ports of each other, not generated from a shared source. Check which one you're editing by the file extension/location before assuming a fix is "done."

The React frontend (`src/`) talks to whichever backend is running via `/api/*`; `vite.config.ts` proxies `/api` to `http://localhost:8787` (the local Express server) during `npm run dev`.

### Data layer difference

- Production (`functions/`) uses **Cloudflare D1** (SQLite over HTTP, async, `env.DB.prepare(sql).bind(...).all()/.first()/.run()`). Schema lives in `schema.sql` at the repo root and is applied via `wrangler d1 execute --remote --file=./schema.sql`. There is no ORM/migration tool — schema changes are applied by hand with `ALTER TABLE` run manually against D1 (see `server/db.js` for the equivalent idempotent migration pattern used locally).
- Local dev (`server/`) uses **`node:sqlite`** (built into Node, no native deps — deliberately *not* `better-sqlite3`, which fails to build on Windows without MSVC tooling) writing to `server/data.db`. `server/db.js` runs `CREATE TABLE IF NOT EXISTS` plus a few `ALTER TABLE ... ADD COLUMN` wrapped in try/catch, so re-running it on an existing `data.db` is safe.
- Both schemas must match column-for-column (`subject`, `time` on `tasks`/`knowledge_points` were added after the fact in both places).

### Auth

JWT-based, no sessions. Production uses `jose` (Workers-compatible); local server uses `jsonwebtoken`. Token payload: `{ id, role: "student" | "teacher", name }`. Passwords hashed with `bcryptjs` (pure-JS, works in both Node and Workers runtime) in both backends.

### AI integration (Gemini)

`functions/_lib/gemini.ts` and `server/gemini.js` wrap `@google/generative-ai`, model `gemini-3.8-flash`, with a 20s timeout (`Promise.race`). **Every Gemini call has a deterministic fallback path** — the app must stay fully usable when Gemini is unavailable or rate-limited:

- `parseDocumentToKnowledgePoints`: falls back to naive line-splitting of the raw text with junk-line filtering.
- `generateQuestions`: as of the current design, **does not fabricate fallback questions**. If Gemini fails, it returns `{ questions: [], aiAvailable: false }` and the frontend (`QuizModal.tsx`) shows an honest "AI unavailable, try again" notice rather than low-quality filler questions (an earlier fill-in-the-blank fallback was deliberately removed — don't reintroduce it).
- Quiz questions are always grounded in the actual uploaded document text (`documents.raw_text`, joined via `knowledge_points.document_id`), never generated from the knowledge-point title alone — this was a deliberate fix for low-quality quizzes.

The free Gemini tier used in dev is capped at ~20 requests/day for this model; hitting that quota looks identical to the model being "down" (429) and is expected during heavy manual testing.

### Document parsing (PDF/PPTX)

`functions/_lib/documentParser.ts` and `server/documentParser.js` (parallel implementations, same API) extract text from uploads:

- PDF via `unpdf` (pdf.js wrapper built for edge/serverless runtimes — this is why it's used instead of a Node-native PDF lib).
- PPTX via `fflate` (pure-JS zip) + regex XML parsing of `ppt/slides/slideN.xml`, grouped by `<a:p>` paragraph so bullet/line structure survives (critical: a naive join of all `<a:t>` runs collapses a slide into one unreadable line and breaks downstream sentence-splitting).
- Only modern `.pptx`/`.pdf` are supported; legacy `.ppt`/`.doc` throw `UnsupportedFileError`.

### Scheduler

`functions/_lib/scheduler.ts` / `server/scheduler.js` generate the "AI 全自動排程" (full auto-schedule) mode: spaces "new" learning tasks across the first 70% of the available days, then schedules spaced-repetition reviews at +1/+3/+7/+15 days (clamped to the deadline), plus periodic quizzes every 3/7 days. Pure functions, no I/O — easy to unit-test in isolation if needed.

**Date handling gotcha**: all date math in the scheduler/stress modules uses UTC-anchored arithmetic (`dateUtils.ts`/`dateUtils.js`, via `Date.UTC`) specifically because naive local-time `Date` arithmetic broke in UTC+8 (the deployment's actual timezone) — it caused `addDays` to never advance, infinite-looping the schedule generator. Don't "simplify" this back to local-time Date math.

### Stress heuristic

`computeStressLevel` (`functions/_lib/stress.ts` / `server/stress.js`) looks at the last 3 days of tasks: 4 levels (輕鬆/正常/偏高/過載) from overloaded-day count (>240 min/day) and completion rate. Completion rate is computed only over **past** days (`date < today`), not today — counting today's still-in-progress tasks as "incomplete" was an earlier bug that made freshly-generated schedules show false "過載".

## Commands

Two servers run independently; both are needed for local dev.

```bash
# Frontend (repo root) — Vite dev server on :5173, proxies /api to :8787
npm install
npm run dev

# Backend (server/ directory) — Express on :8787
cd server
npm install
npm run dev

# Type-check frontend
npx tsc -b --noEmit

# Type-check the Cloudflare Functions backend (separate tsconfig; not part of the Vite build)
npx tsc --noEmit -p tsconfig.functions.json

# Production build (frontend only; functions/ is deployed as source, not pre-built)
npm run build

# Deploy to Cloudflare Pages production
npm run pages:deploy

# Run Pages Functions + D1 locally (alternative to the server/ Express stack)
npm run pages:dev
```

There is no test suite and no lint script configured.

### Cloudflare/D1 operations

```bash
# Apply schema.sql to the remote D1 database (re-run after editing schema.sql)
npx wrangler d1 execute ai-study-calendar-db --remote --file=./schema.sql

# Ad-hoc query against prod D1
npx wrangler d1 execute ai-study-calendar-db --remote --command "SELECT ..."

# Secrets (GEMINI_API_KEY, JWT_SECRET) — set via wrangler, not in wrangler.toml
npx wrangler pages secret put GEMINI_API_KEY --project-name ai-study-calendar

# Tail live production logs (console.warn/error in functions/_lib show up here)
npx wrangler pages deployment tail <deployment-id> --project-name ai-study-calendar
```

`server/.env` holds `GEMINI_API_KEY`, `JWT_SECRET`, `PORT` for local dev (gitignored). Production secrets are stored in Cloudflare, not in any committed file.

## Known gaps (don't assume these exist)

- Legacy `.doc`/`.ppt` upload is unsupported by design.
- No teacher-facing push/real-time notification for sustained student stress — `stress_logs` is written but nothing proactively surfaces it beyond the teacher dashboard polling the overview.
- No per-subject data isolation (subject is just a label/color on tasks and knowledge points, not a partition).
- No payment/billing.
