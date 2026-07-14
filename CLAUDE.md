# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Phase status and future work: [docs/ROADMAP.md](docs/ROADMAP.md).

## Stack

- **Client**: React 19 + Vite 8, Tailwind 3, React Router 7, Recharts. Token in `localStorage['spp_token']`, user in `localStorage['spp_user']`.
- **Server**: Node.js + Express 5 (CommonJS), Mongoose 9 (MongoDB), JWT + bcryptjs, `express-rate-limit`, Multer for uploads, `pdf-parse` + `mammoth` for resume text, `nodemailer` for outgoing email, Socket.IO 4 for real-time notifications, `@anthropic-ai/sdk` when `LLM_PROVIDER=anthropic`.
- **AI**: Pluggable LLM provider in `server/utils/llm/`. `LLM_PROVIDER` env selects `ollama` (default, local, no cost) or `anthropic` (cloud, needs `ANTHROPIC_API_KEY` — default model `claude-haiku-4-5-20251001`). All AI code calls `getProvider().generateJSON(...)` / `.generateText(...)` / `.health()`. Adding a new provider = new file in `server/utils/llm/` exporting the same 3-method interface + name, then register in `index.js`. Regex fallback in `aiExtractor.js` stays as the safety net.
- **Deploy**: Vercel. Static client from `client/dist`; the Express app is re-exported as a serverless function via `api/index.js`. Local dev uses `server/server.js` (calls `app.listen`); Vercel uses `api/index.js` (no listen, `module.exports = app`). **When adding a route, both files must import and mount it.**

## Commands

Run from repo root.

```bash
# One-time
npm install
npm install --prefix server
npm install --prefix client
cp server/.env.example server/.env
cp client/.env.example client/.env

# Dev — server on 5050, client on 5173 (Vite picks the next free port if 5173 is busy)
npm run dev              # both via concurrently
npm run dev:server       # server only (nodemon)
npm run dev:client       # client only

# Build (client only)
npm run build

# Seed sample data (destructive — deletes User/StudentProfile/Job/Application/MatchScore first)
npm run seed --prefix server
# Creates: student1@spp.dev, student2@spp.dev, recruiter@spp.dev, admin@spp.dev
# Password for all: Password@123

# Lint (client only, no server lint)
npm run lint --prefix client

# Health checks
curl http://localhost:5050/api/health
# /api/ai/health requires a student Bearer token — probably shouldn't. Fix if you touch that route.
```

Server tests (Vitest + Supertest + mongodb-memory-server):

```bash
npm test --prefix server                              # one-shot, all tests
npm run test:watch --prefix server                    # watch mode
npm test --prefix server -- tests/auth.test.js        # one file
npm test --prefix server -- -t "duplicate email"       # by test name substring
```

Tests live in `server/tests/`. `setup.js` spins up an in-memory MongoDB and wipes collections between tests. **Env vars are set at the top of `setup.js`, not in `beforeAll`** — auth modules read `process.env.JWT_SECRET` at import time. CI runs both `server-tests` and `client-lint + build` via `.github/workflows/ci.yml`.

No client test suite yet — deferred.

## Directory layout

```
/               root package.json + concurrently
/client         Vite React SPA
/server         Express API + Mongoose models
/api/index.js   Vercel serverless wrapper (imports from ../server/**)
vercel.json     Vercel build/routing config
```

## Backend

### Auth model

- JWT (`jsonwebtoken`) with 7-day expiry, signed with `JWT_SECRET` (falls back to `'dev_jwt_secret_change_me'` — **never rely on that in prod**).
- Roles on `User`: `student`, `recruiter`, `admin`. Admin signup requires the `ADMIN_SIGNUP_CODE` env value (default `placement_admin_2026`).
- `middleware/auth.js` exports `authMiddleware` and `requireRole(role)`.
- **Token can also come from `?token=<jwt>` query string** — this exists so browsers can download `.ics` files by clicking a link (`/api/interviews/:id/calendar`). Don't remove it without also fixing the calendar flow.
- Emails are lowercased at both signup and lookup — preserve that when adding user queries.
- Every successful login writes a `LoginEvent` (userId, email, IP, UA, timestamp) for audit.

### Routes (mounted in `server/server.js` **and** `api/index.js`)

| Method + path | Auth | What it does |
|---|---|---|
| `POST /api/auth/signup` | public | body: `{name,email,password,role,adminCode?}` |
| `POST /api/auth/login` | public | body: `{email,password}` → `{token,user}` |
| `GET /api/auth/me` | any | returns `req.user` |
| `POST /api/auth/forgot-password` | public | **rate-limited 5/hr per IP**; always returns 200 to avoid leaking account existence; emails reset link if user exists |
| `POST /api/auth/reset-password` | public | `{token,newPassword}`; token expires in 1 hour and is single-use (marked `usedAt`) |
| `GET /api/students/profile` | student | returns default shape if no doc exists |
| `PUT /api/students/profile` | student | upserts; validates bio ≤500 chars, numeric fields ≥0 |
| `POST /api/students/profile/resume` | student | `{resumeUrl}` — must be `http(s)://…` |
| `GET /api/jobs` | any | filters: `company, skills, minSalary, maxSalary, page, pageSize`. **Students see only `active`+`approved` jobs, sorted by match score (skills 70/exp 20/salary 10)**. Recruiters see only their own. |
| `GET /api/jobs/:jobId` | any | students only see approved+active; recruiters only their own |
| `POST /api/jobs` | recruiter | creates with `approved: false` — admin must approve before students see it |
| `PUT /api/jobs/:jobId` | recruiter | owner only |
| `DELETE /api/jobs/:jobId` | recruiter | soft-close (`status='closed'`), not delete |
| `POST /api/applications` | student | duplicate protected by `{studentId,jobId}` unique index; also upserts a `MatchScore` doc |
| `GET /api/applications/my-applications` | student | paged, populates job |
| `GET /api/applications/job/:jobId` | recruiter | owner only; filters: `search, status, minMatchScore, skill, sortBy(matchScore\|appliedAt), order` |
| `PUT /api/applications/:appId/status` | recruiter | status ∈ `pending, shortlisted, rejected, interview`; **notifies student** |
| `POST /api/applications/bulk-status` | recruiter | `{appIds: [...], status}`; max 100 IDs; rejects with 403 if any app isn't owned by the recruiter (checks **all-or-nothing**); atomic `updateMany`; notifies each affected student |
| `POST /api/interviews` | recruiter | requires future `scheduledAt`; **duration clamped to [15,180]**; **rejects if student has another `scheduled` interview within ±30 min buffer**; sets application status → `interview`; **fires emails (with `.ics`) + in-app notifications to both parties (fire-and-forget)** |
| `GET /api/interviews` | any | scoped by role (student sees own, recruiter sees own); `?upcoming=true` forces `status=scheduled` + future |
| `GET /api/interviews/:id` | student/recruiter of that interview, or admin | |
| `PUT /api/interviews/:id/reschedule` | recruiter owner | can't reschedule `completed`/`cancelled`; fires reschedule email + notifications |
| `PUT /api/interviews/:id/cancel` | recruiter owner | reverts application status → `shortlisted`; fires cancel email + notifications |
| `PUT /api/interviews/:id/complete` | recruiter owner | records `feedback`, `rating` (1–5 clamped) |
| `GET /api/interviews/:id/calendar` | authorized viewer | returns `.ics`; supports `?token=` for direct browser download |
| `GET /api/interviews/slots/:recruiterId` | any | `?date=YYYY-MM-DD`, returns 30-min slots 9 AM–6 PM UTC with `available` flag |
| `GET /api/admin/analytics` | admin | totals, placement rate (`shortlisted`+`interview`/total apps), avg package, top 5 companies, 12-month trend, recent placements |
| `GET /api/admin/approvals` | admin | jobs with `approved: false`, paged |
| `POST /api/admin/approve-job/:jobId` | admin | flips `approved: true`; **notifies posting recruiter** |
| `GET /api/ai/health` | student | current LLM provider health — Ollama tags endpoint or Anthropic key presence |
| `POST /api/ai/resume/upload` | student | multipart `resume` field, PDF/DOCX only, ≤10 MB. Auto-versioned per user via `pre('save')` hook. |
| `POST /api/ai/resume/analyze` | student | full pipeline: extract text → Ollama → save `ResumeAnalysis` → **upserts extracted `skills`/`education`/`projects`/`certifications` back into `StudentProfile`**; **notifies student when done** |
| `GET /api/ai/resume/status` | student | latest upload state |
| `GET /api/ai/resume/history` | student | last 10 uploads |
| `GET /api/ai/resume/versions` | student | last 5 uploads with `{topScore, avgScore, jobsScored, analyzedAt}` — feeds the compare picker |
| `GET /api/ai/resume/compare?a=&b=` | student | side-by-side extractedData + diff `{skillsAdded, skillsRemoved, jobScoreDeltas}`; deltas sorted by absolute magnitude |
| `GET /api/ai/fit/companies` | student | company-level fit (best job per company) |
| `GET /api/ai/fit/jobs` | student | per-job fit with matched/missing skills |
| `POST /api/ai/ask` | student | context-only Q&A over their analysis + top 10 job matches; **persists both user question and assistant reply as `ChatMessage`** |
| `GET /api/ai/chat` | student | returns persisted chat history (default 50, max 200 via `?limit=`) |
| `DELETE /api/ai/chat` | student | wipes the current user's chat history |
| `GET /api/notifications` | any | paged; `?unreadOnly=true`; returns `{items, unreadCount, total, totalPages}` |
| `POST /api/notifications/:id/read` | any | owner only |
| `POST /api/notifications/read-all` | any | marks all current user's unread → read |

### Data model (`server/models/`)

- `User` — `{name, email(unique,lowercase), passwordHash, role}`.
- `StudentProfile` — 1:1 with `User` (unique `userId`); mixes user-provided fields (`skills, bio, expectedSalary, prefJobTitles, yearsOfExperience`) with AI-extracted ones (`education, projects, certifications, lastAnalyzedAt`).
- `Job` — `{title, company, description, requiredSkills, minExperience, minSalary, maxSalary, status(active|closed), approved, postedBy}`. **`requiredSkills` are stored lowercase**; `approved` gates student visibility.
- `Application` — `{studentId, jobId, status, matchScore, appliedAt}`. Unique compound index `{studentId, jobId}`.
- `Interview` — extensive fields; unique index on `applicationId`; secondary indexes on `{studentId, scheduledAt}` and `{recruiterId, scheduledAt}`.
- `ResumeUpload` — file metadata + `status ∈ uploaded|parsing|extracted|analyzed|failed`. `pre('save')` auto-increments `version` per user.
- `ResumeAnalysis` — extracted resume data + `companyFitScores[]` + `jobFitScores[]` with 5-factor breakdown.
- `MatchScore` — cached per `{studentId, jobId}` (unique) for reuse.
- `LoginEvent` — audit trail.
- `ChatMessage` — `{userId, role: user|assistant, text, fromContext?, confidence?}`. Written by `POST /api/ai/ask` (best-effort; persist failure doesn't fail the request). Indexed on `{userId, createdAt}`.
- `Notification` — `{userId, type, title, body, link?, read, meta}`. `type` enum covers application/interview/resume/job events. Indexed on `{userId, read, createdAt: -1}`. Written by `utils/notifier.js` (best-effort).
- `PasswordResetToken` — `{userId, tokenHash, expiresAt, usedAt?}`. Token stored as SHA-256 hash, never plaintext. TTL index on `expiresAt` auto-deletes expired records.

### Match algorithm (`server/utils/matchAlgorithm.js`)

Two functions, both return `{score, matchedSkills, missingSkills, explanation}`:

- `calculateMatchScore` — used for the **jobs listing** and **application submission**. Weights: **skills 70 / experience 20 / salary 10**. Salary uses neutral 50 when data is missing.
- `calculateEnhancedMatchScore` — used **only by the AI resume analyzer** (`companyScorer.js`). Also returns `factors: {skills, experience, salary, education, projects}`. Weights: **skills 55 / experience 20 / salary 10 / education 10 / projects 5**. Merges `extractedData.skills` with profile skills; converts `yearsOfExperience` to months and takes max with `totalExperienceMonths`; degree scoring keyed off substrings in `edu.degree` after lowercasing.

If you change the enhanced factor weights or shape, `models/ResumeAnalysis.js`'s `factorsSchema` and the `AskAssistant` scoring rubric prompt in `utils/aiAssistant.js` must be updated together — the LLM cites the weights in its answers.

### AI / resume pipeline

1. `POST /api/ai/resume/upload` — Multer saves to `server/uploads/` locally, `/tmp` on Vercel (checked via `process.env.VERCEL`). Filename: `<userId>-<timestamp>-<rand>.<ext>`. 10 MB limit; PDF + DOCX only.
2. `POST /api/ai/resume/analyze`:
   - `utils/resumeParser.js` → text via `pdf-parse` (`new PDFParse(Uint8Array).getText()` — note the class API, not the older function) or `mammoth`, then normalized whitespace.
   - `utils/aiExtractor.js` → `getProvider().generateJSON(...)` from `utils/llm/` with strict JSON-only system prompt, `temperature: 0.1`, `maxTokens: 2048`. Provider handles the transport (Ollama HTTP or Anthropic SDK). On any error or malformed JSON, `regexFallback()` runs (skills, education, cert, coarse experience).
   - `utils/companyScorer.js` → `computeCompanyScores` (best job per company) and `computeJobScores` (all jobs), both using `calculateEnhancedMatchScore`.
   - Persists `ResumeAnalysis` (upsert on `{userId, resumeId}`), **and merges extracted data back into `StudentProfile`** via `$set` on education/projects/certifications and `$addToSet` on skills.
3. `POST /api/ai/ask` — `utils/aiAssistant.js` builds a context block (resume data + top 10 jobs by score + scoring rubric), sends it via `getProvider().generateText(...)` with `temperature: 0.3` for context-only answers, and heuristically flags low confidence when the reply contains "don't have enough information" etc.

### Communications (email + in-app notifications)

- **Email** goes through `utils/mailer.js` (nodemailer). If `SMTP_HOST` is unset, emails are silently logged to stdout via `jsonTransport` — dev works without any SMTP setup. Templates live in `utils/emailTemplates.js` and are HTML-escaped. Callers **must fire-and-forget** with `.catch()` — email failures never block API responses.
- **In-app notifications** go through `utils/notifier.js` → `Notification` model. `notifier.notify()` also calls `emitToUser(userId, 'notification', doc)` from `utils/socketBus.js`, which pushes the notification live to any connected socket in the `user:<userId>` room. The client shows it instantly; the 60s poll is a fallback.
- Interview lifecycle emits **both** email and notification; other events (application status, resume analysis, job approval) emit only notifications.
- Password reset uses `PasswordResetToken` (SHA-256 hash of the raw token stored; raw token only in the email link). Rate-limited to 5/hr per IP via `express-rate-limit`. Always returns 200 to avoid leaking whether an email exists.

### Real-time (Socket.IO)

- Attached in `server/server.js` **only** — not in `api/index.js`. Serverless functions can't hold long-lived connections, so on Vercel `socketBus.getIO()` returns `null` and `emitToUser` is a no-op; the client falls back to polling.
- JWT auth at handshake time (`socket.handshake.auth.token`). Invalid/missing token → connection rejected. Each authenticated socket joins the room `user:<userId>`.
- To push a live event to a specific user from any route or utility: `require('./utils/socketBus').emitToUser(userId, 'event-name', payload)`. Never `require` `io` directly — always go through the bus so Vercel stays no-op-safe.
- In dev, Vite forwards WebSocket upgrades via a `/socket.io` proxy with `ws: true` — see `client/vite.config.js`. Without that flag Socket.IO would fall back to long-poll only.
- Client hook `useSocket()` handles the lifecycle: connects on login, disconnects on logout, reconnects on token change. `useNotifications` subscribes to the `notification` event and dedupes by `_id` to avoid double-inserts when the poll and socket race.

### Vercel routing quirk

`vercel.json` rewrites `/api/(.*) → /api` and `/(.*) → /index.html`. The Express app inside `api/index.js` sees the full `/api/...` path, so mount paths must include `/api` (they do). **Don't strip the prefix.** Uploads on Vercel go to ephemeral `/tmp` — files won't survive across invocations, so multi-request flows (upload then later analyze) will break unless a durable store is added.

## Client

### Routing (`src/App.jsx`)

`/` redirects by role. `/auth` is the login/signup page. Every other route wraps in `<ProtectedRoute>`; passing a `role` prop enforces role match and redirects to the correct dashboard otherwise. Fallback route → `/`.

Routes: `/dashboard/student`, `/dashboard/recruiter`, `/dashboard/admin`, `/jobs/:jobId`, `/resume-intelligence` (student only), `/interviews`.

### AuthContext (`src/context/AuthContext.jsx`)

Persists `token` and `user` to `localStorage` (`spp_token`, `spp_user`). Exposes `{token, user, isAuthenticated, setSession, logout}`. `isAuthenticated = Boolean(token && user)`. There's no auto-refresh or expiry check — a stale token will only surface when a request returns 401.

### API client (`src/utils/api.js`)

Single `apiRequest(path, options)` helper. Reads `VITE_API_BASE_URL` (empty in dev so the Vite proxy handles `/api` → `localhost:5050`; set explicitly for prod builds). Attaches `Authorization: Bearer <token>` automatically. Multipart uploads (`FormData`) bypass this helper and use `fetch` directly (see `useResumeAI.uploadResume`).

### Data hooks (`src/hooks/`)

Pages should call these, not `apiRequest` directly.

- `useJobs(filters)` — auto-refetches when `JSON.stringify(filters)` changes (note: object identity is intentionally ignored via stringify).
- `useApplications(filters)` — student's own applications.
- `useInterviews({upcoming, status})` — plus mutators `schedule/reschedule/cancel/completeInterview` that refetch on success.
- `useProfile()` — student profile with `saveProfile(payload)`.
- `useResumeAI()` — full lifecycle: upload, analyze, poll status (2 s interval, auto-stops on terminal state), fetch scores, ask questions. **Chat history is persisted server-side** — hydrated from `GET /api/ai/chat` on mount; `clearChat` calls `DELETE /api/ai/chat`. On mount it kicks off `fetchStatus`, `checkHealth`, `fetchCompanyScores`, `fetchJobScores`, `fetchChatHistory` in parallel.
- `useSocket()` — manages the Socket.IO connection to the API server. Auto-connects when a token is present, disconnects on logout, reconnects on token change (up to 10 attempts, exponential backoff). Returns `{connected, on, socket}`. Uses `VITE_API_BASE_URL` if set, otherwise same-origin (Vite proxies `/socket.io` in dev).
- `useNotifications()` — 60 s poll fallback + real-time push via `useSocket().on('notification', ...)`. Also refetches on tab focus. Exposes `{items, unreadCount, live, markRead, markAllRead}`. Dedupes incoming socket pushes by `_id` in case the poll fires immediately after. Used by `NotificationBell` in all three dashboard headers.

### Styling / design tokens

Tailwind config (`client/tailwind.config.js`) defines:
- Colors: `intel-blue` (#1A73E8), `intel-blue-dark`, `intel-blue-light`, `success`, `warning`, `error`.
- Fonts: `heading` (Manrope), `sans` (Inter).
- `rounded-portal` (12px), `shadow-panel`.

Use these tokens instead of hardcoding hex values. Formatters in `src/utils/formatters.js` render INR currency, LPA (Lakhs Per Annum = value/100000), match labels (`Poor/Good/Excellent`), and interview date/time/countdown.

## Conventions & gotchas

- **CJS vs ESM split** — server is `"type": "commonjs"`, client is `"type": "module"`. Don't cross the streams.
- **Skills are lowercased at the boundary** — jobs and student skills are stored/compared lowercase. Preserve this in any new skill-related code.
- **`server/uploads/` has real sample PDFs committed** (7 files). Don't add more; on Vercel this path isn't used (goes to `/tmp`).
- **Env leak history** — commits `cad613b`, `60ac244`, `de1b196` are the scrub trail for a leaked `server/.env`. Treat anything found in old history as compromised and rotate.
- **Ollama defaults** — `.env.example` says `llama3` but `ollamaProvider.js` defaults to `qwen2.5-coder`. Only matters when `LLM_PROVIDER=ollama`; irrelevant on Anthropic. Whatever's in your `.env` wins over both.
- **PDF parser API** — `resumeParser.js` uses `new PDFParse(new Uint8Array(buf)).getText()`, which is the class-based API from `pdf-parse` v2. Older `pdf-parse(buf)` functional API won't work.
- **Duplicate interview prevention** relies on: unique index on `applicationId` + a manual ±30-min window check on the student. Don't remove either; they cover different cases.
- **Server tests** — `npm test --prefix server` (Vitest 2 with globals enabled — do NOT upgrade to Vitest 4 without switching test files to ESM). Client has no tests yet.
- **CI** — `.github/workflows/ci.yml` gates PRs on both server tests and client lint + build.
