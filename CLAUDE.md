# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo state warning (read first)

Local `main` and `origin/main` have **completely divergent histories** (no common ancestor). The real project lives on `origin/main`; local `main` is a near-empty scaffold with only `README.md`, `LICENSE`, and `.gitignore`. If `ls` shows almost nothing, you are on a branch descended from the empty local `main` — inspect `origin/main` instead (e.g. `git show origin/main:<path>`) or reset local `main` to `origin/main` before working.

All paths and commands below refer to the tree on `origin/main`.

## Stack

- **Client**: React 19 + Vite 8, Tailwind 3, React Router 7, Recharts. Auth token stored in `localStorage` under key `spp_token`; user under `spp_user`.
- **Server**: Node.js + Express 5, Mongoose 9 (MongoDB), JWT (`jsonwebtoken`) + bcryptjs, Multer for uploads, `pdf-parse` + `mammoth` for resume text extraction.
- **AI**: Local Ollama HTTP API (`OLLAMA_URL`, default `http://localhost:11434`; `OLLAMA_MODEL`, default `llama3`) for resume parsing and the in-app assistant. `aiExtractor.js` falls back to regex parsing if the LLM output is malformed — don't remove the fallback.
- **Deploy**: Vercel. Static client from `client/dist`; Express app re-exported as a serverless function via `api/index.js` (imports from `../server/**`). Local dev uses `server/server.js` (which calls `app.listen`); Vercel uses `api/index.js` (no listen, `module.exports = app`). Keep both in sync when adding routes.

## Commands

Run from repo root unless noted.

```bash
# One-time
npm install
npm install --prefix server
npm install --prefix client
cp server/.env.example server/.env
cp client/.env.example client/.env

# Dev (client on Vite port, proxies /api → localhost:5050; server on 5050)
npm run dev              # both via concurrently
npm run dev:server       # server only (nodemon)
npm run dev:client       # client only

# Build (client only; server is not bundled)
npm run build

# Seed sample data
npm run seed --prefix server

# Lint (client)
npm run lint --prefix client

# Health check
curl http://localhost:5050/api/health
```

No test suite is configured.

## Architecture

### Directory layout
```
/               root package.json + concurrently for dev
/client         Vite React SPA
/server         Express API + Mongoose models
/api/index.js   Vercel serverless wrapper (imports from ../server)
vercel.json     Vercel build/routing config
```

### Backend request path

`server/server.js` (or `api/index.js` on Vercel) wires the same seven route modules under `/api/*`:

| Mount | File | Purpose |
|---|---|---|
| `/api/auth` | `routes/auth.js` | signup, login, `me`; logs `LoginEvent`; admin signup requires `ADMIN_SIGNUP_CODE` |
| `/api/students` | `routes/students.js` | student profile CRUD |
| `/api/jobs` | `routes/jobs.js` | job postings |
| `/api/applications` | `routes/applications.js` | student → job applications |
| `/api/interviews` | `routes/interviews.js` | scheduling + `.ics` export (`utils/icsGenerator.js`) |
| `/api/admin` | `routes/admin.js` | admin analytics |
| `/api/ai` | `routes/ai.js` | resume upload + LLM extraction + match/company scoring + assistant chat |

Auth is a Bearer JWT — `middleware/auth.js` exposes `authMiddleware` and `requireRole(role)`. JWT secret comes from `JWT_SECRET` (falls back to a hardcoded dev string — never rely on that in prod).

Roles: `student`, `recruiter`, `admin`. Role is stored on `User` and drives both API guards and client route guards.

### AI / resume pipeline (`routes/ai.js` + `utils/`)

1. Multer accepts PDF or DOCX; uploads go to `server/uploads/` locally, `/tmp` on Vercel (`process.env.VERCEL`).
2. `utils/resumeParser.js` extracts raw text.
3. `utils/aiExtractor.js` posts to Ollama with a strict JSON-only system prompt; on parse failure, regex fallback runs. Result is persisted as `ResumeAnalysis`.
4. `utils/matchAlgorithm.js` computes weighted skill/experience/salary match; `utils/companyScorer.js` ranks jobs/companies for a student.
5. `utils/aiAssistant.js` powers the `AskAssistant` chat component.

If you change the extractor's output shape, update `models/ResumeAnalysis.js` and the `useResumeAI` hook together.

### Client structure

- `src/App.jsx` — all routes; role-based redirects from `/`.
- `src/context/AuthContext.jsx` — token/user persistence in `localStorage`; hydrates on mount.
- `src/components/ProtectedRoute.jsx` — accepts a `role` prop for role-gated pages.
- `src/utils/api.js` — thin `fetch` wrapper. Reads `VITE_API_BASE_URL` (empty in dev, so the Vite proxy handles `/api`; set explicitly for prod). Automatically attaches the Bearer token.
- Data-fetching hooks in `src/hooks/` (`useJobs`, `useApplications`, `useInterviews`, `useProfile`, `useAnalytics`, `useResumeAI`) — pages should go through these rather than calling `apiRequest` directly.

### Vercel routing quirk

`vercel.json` rewrites `/api/(.*) → /api` and `/(.*) → /index.html`. The Express app inside `api/index.js` sees the full `/api/...` path, so mount paths in the Express app must include `/api` (they do). Don't strip the prefix.

## Conventions

- Server uses CommonJS (`"type": "commonjs"`); client is ESM (`"type": "module"`). Don't mix.
- Emails are lowercased before storage/lookup in `routes/auth.js` — preserve that when adding user queries.
- `server/uploads/` contains committed sample PDFs. Don't add more real uploads to git; the runtime writes there but it's for local dev only (Vercel uses `/tmp`).
- Env files have been leaked in history and scrubbed (commits `cad613b`, `60ac244`, `de1b196`). Never commit `.env`; treat any secrets found in old history as compromised.
