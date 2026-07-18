<div align="center">

# Nexus — Smart Placement Portal

**AI-powered placement platform for students, recruiters and placement cells.**
Resume analysis, smart job matching, interview coordination and real-time notifications — one workspace.

[![Live demo](https://img.shields.io/badge/Live-Vercel-black?style=flat-square&logo=vercel)](https://smart-placement-portal-henna.vercel.app)
[![Node](https://img.shields.io/badge/Node-18+-brightgreen?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![Express](https://img.shields.io/badge/Express-5-000?style=flat-square&logo=express)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_9-47a248?style=flat-square&logo=mongodb&logoColor=white)](https://mongoosejs.com)
[![Tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Deploy: Vercel](https://img.shields.io/badge/Deploy-Vercel-000?style=flat-square&logo=vercel)](https://vercel.com)

**🔗 Live demo:** <https://smart-placement-portal-henna.vercel.app>

</div>

---

## ✨ Highlights

- **Three role-based workspaces.** Student, Recruiter and Admin dashboards, each purpose-built and permission-gated.
- **AI resume intelligence.** Upload a PDF/DOCX resume → extract skills, education, projects, certifications → score against every open role, per-company and per-job, with a 5-factor breakdown.
- **Smart job matching.** Every job is ranked for the student using a weighted score (skills 70 / experience 20 / salary 10).
- **End-to-end interview coordination.** Schedule, reschedule, cancel or complete interviews; automatic `.ics` calendar invites; email + in-app notifications.
- **Real-time notifications.** Socket.IO push over a room-per-user, with polling as a fallback for serverless deploys.
- **Pluggable LLM.** Local Ollama by default (free, private) or Anthropic Claude in production — switch with a single env var.
- **Pluggable storage.** Local disk in dev, S3 / Cloudflare R2 / Backblaze B2 / MinIO in production.
- **Security-first defaults.** Bcrypt-hashed passwords, JWT with 7-day expiry, login + password-reset rate limiting, env validation at startup, single-use SHA-256-hashed reset tokens.
- **Light editorial UI.** Modern `stone-50 / zinc-900 / emerald-600` theme built with Tailwind + Manrope + Inter.

---

## 🖼️ Screens

| Auth | Student dashboard | Resume intelligence |
| :---: | :---: | :---: |
| _add screenshot_ | _add screenshot_ | _add screenshot_ |

| Recruiter dashboard | Admin analytics | Interview centre |
| :---: | :---: | :---: |
| _add screenshot_ | _add screenshot_ | _add screenshot_ |

> Drop PNGs into `docs/screenshots/` and update the table.

---

## 🧱 Stack

**Client** — React 19 · Vite 8 · Tailwind 3 · React Router 7 · Recharts · Vitest 4 + Testing Library + MSW 2
**Server** — Node.js · Express 5 · Mongoose 9 · JWT · bcryptjs · Multer · pdf-parse · mammoth · Nodemailer · Socket.IO 4 · `@anthropic-ai/sdk`
**AI** — Pluggable provider (`ollama` default, `anthropic` in prod) via `server/utils/llm/`
**Storage** — Pluggable backend (`disk` default, `s3`/`r2`/`b2`/`minio` in prod) via `server/utils/storage/`
**Deploy** — Vercel (static client + Express as a serverless function)

---

## 🚀 Quick start

```bash
# 1) Clone
git clone https://github.com/ShadowAN-AB/-smart-placement-portal.git
cd -smart-placement-portal

# 2) Install (root + server + client)
npm install
npm install --prefix server
npm install --prefix client

# 3) Env
cp server/.env.example server/.env
cp client/.env.example client/.env
# edit server/.env — see the reference below

# 4) Seed demo data (optional, destructive: wipes users/jobs/apps)
npm run seed --prefix server

# 5) Dev — starts server on :5050 and client on :5173
npm run dev
```

Open <http://localhost:5173>. Demo logins after seeding:

| Role      | Email                | Password      |
| --------- | -------------------- | ------------- |
| Student   | `student1@spp.dev`   | `Password@123` |
| Recruiter | `recruiter@spp.dev`  | `Password@123` |
| Admin     | `admin@spp.dev`      | `Password@123` |

Also useful:

```bash
npm run dev:server       # nodemon, server only
npm run dev:client       # vite, client only
npm run build            # build client to client/dist
npm run lint --prefix client

# Tests
npm test --prefix server                            # server (Vitest + Supertest + mongodb-memory-server)
npm test --prefix client                            # client (Vitest 4 + Testing Library + MSW 2)
npm test --prefix server -- tests/auth.test.js      # single file
npm test --prefix server -- -t "duplicate email"    # by test name
```

---

## 🔧 Environment reference

Copy `server/.env.example` → `server/.env` and fill in:

```dotenv
# Core
PORT=5050
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/smart_placement_portal
JWT_SECRET=change-me-to-a-long-random-string
ADMIN_SIGNUP_CODE=change-me-too

# AI provider — 'ollama' (local, free) | 'anthropic' (cloud)
LLM_PROVIDER=ollama
OLLAMA_MODEL=qwen2.5-coder
# ANTHROPIC_API_KEY=sk-ant-...
# ANTHROPIC_MODEL=claude-haiku-4-5-20251001

# Storage — 'disk' (local) | 's3' (S3, R2, B2, MinIO...)
STORAGE_BACKEND=disk
# S3_BUCKET=
# S3_REGION=
# S3_ACCESS_KEY_ID=
# S3_SECRET_ACCESS_KEY=
# S3_ENDPOINT=            # required for R2, B2, MinIO

# Mail — optional; if unset, emails are logged to stdout
# SMTP_HOST=
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASS=
# MAIL_FROM="Nexus <no-reply@nexus.dev>"
```

Client (`client/.env`):

```dotenv
# Leave empty in dev — Vite proxies /api to :5050
VITE_API_BASE_URL=
# For prod builds, set to your API origin, e.g. https://your-app.vercel.app
```

In production, `server/config/validateEnv.js` **throws** at boot if `JWT_SECRET`, `ADMIN_SIGNUP_CODE` or `MONGODB_URI` is missing or still the dev default.

---

## ☁️ Deploy to Vercel

The repo is Vercel-ready:

- Static client is built from `client/dist`.
- Express is re-exported as a serverless function via [`api/index.js`](api/index.js).
- Routing is defined in [`vercel.json`](vercel.json).

Steps:

1. **Import the repo** on <https://vercel.com/new>.
2. **Env vars** — add every entry from your `server/.env` in Project → Settings → Environment Variables. Do **not** include `PORT`. Set `NODE_ENV=production`.
3. **Storage** — set `STORAGE_BACKEND=s3` + credentials. Vercel writes to ephemeral `/tmp` per invocation, so the default disk backend silently breaks resume analyse across requests.
4. **AI** — set `LLM_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` (Ollama can't run on Vercel).
5. **Client `VITE_API_BASE_URL`** — leave empty; the Vercel rewrite in `vercel.json` routes `/api/*` to the function.
6. **Deploy** — Vercel picks up the build and function.

> **Real-time note:** Socket.IO connections don't survive serverless boundaries. On Vercel, `emitToUser` becomes a no-op and the client falls back to a 60-second poll. For always-on realtime, host the server on Render / Fly / Railway.

---

## 🏗️ Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                             Vercel edge                               │
│  ┌────────────────┐         ┌────────────────────────────────────────┐│
│  │  Static SPA    │  /api/* │  api/index.js  (Express as function)   ││
│  │  (Vite build)  │────────▶│  ────────────────────────────────────  ││
│  └────────────────┘         │  routes/  models/  utils/              ││
│                             │      ├── llm/  (ollama | anthropic)    ││
│                             │      └── storage/ (disk | s3)          ││
│                             └────────────────────────────────────────┘│
│           ▲                                    │                      │
│           │ polls /api/notifications           │                      │
│           │                                    ▼                      │
│  ┌────────────────┐         ┌────────────────────────────────────────┐│
│  │  Local dev     │  ws/    │  server/server.js  (Socket.IO + REST)  ││
│  │  Vite proxy    │◀───────▶│  emits to user:<id> rooms              ││
│  └────────────────┘         └────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────┐
│  MongoDB (Mongoose)│  Users · Jobs · Applications · Interviews
│                    │  ResumeUpload · ResumeAnalysis · MatchScore
│                    │  Notification · ChatMessage · LoginEvent
└────────────────────┘
```

**Auth.** JWT (7-day) via `jsonwebtoken`, bcryptjs for passwords, role-gated middleware (`authMiddleware`, `requireRole`). Every login writes a `LoginEvent` audit row.

**Matching.** Two variants in `server/utils/matchAlgorithm.js`:
- `calculateMatchScore` — the live listing + apply score (skills 70 / experience 20 / salary 10).
- `calculateEnhancedMatchScore` — used by resume AI (skills 55 / experience 20 / salary 10 / education 10 / projects 5), returns per-factor breakdown.

**Resume pipeline.** Upload → parse (`pdf-parse` v2 class API or `mammoth`) → LLM extract (`temperature 0.1`, JSON-only prompt) with regex fallback → score per company and per job → merge extracted skills/education/projects/certifications back into the `StudentProfile`.

**Comms.** Email via Nodemailer (`jsonTransport` fallback when no SMTP), in-app via `utils/notifier.js` + Socket.IO room-per-user. Interviews emit both; other events emit notifications only.

**Password reset.** SHA-256 hashed tokens, single-use, 1-hour TTL, response is always 200 to avoid account enumeration.

For a deep dive — routes, data model, gotchas, testing setup — read [`CLAUDE.md`](CLAUDE.md).

---

## 🗂️ Repo layout

```
├── api/              # Vercel serverless entry — re-exports the Express app
├── client/           # Vite + React SPA
│   ├── src/pages/    # Auth, dashboards, resume intelligence, interviews, job detail
│   ├── src/hooks/    # useJobs, useApplications, useInterviews, useResumeAI, useNotifications, useSocket, useProfile
│   └── tests/        # Vitest + Testing Library + MSW
├── server/           # Express API
│   ├── routes/       # auth, jobs, applications, interviews, students, admin, ai, notifications
│   ├── models/       # Mongoose schemas
│   ├── utils/        # llm/, storage/, mailer, notifier, socketBus, matchAlgorithm, aiExtractor, ...
│   └── tests/        # Vitest + Supertest + mongodb-memory-server
├── docs/ROADMAP.md   # phased plan
├── vercel.json       # build + rewrite config
├── CLAUDE.md         # detailed engineering notes
└── README.md
```

---

## 🧪 Testing

- **Server** — `npm test --prefix server` spins up an in-memory MongoDB via `mongodb-memory-server` and wipes collections between tests. Env vars are set at the top of `setup.js` so auth modules read them at import time.
- **Client** — `npm test --prefix client` uses Vitest 4 + Testing Library + MSW 2 for fetch mocking. Handlers live in `client/tests/msw/handlers.js`.
- **CI** — GitHub Actions runs both suites plus `client` lint + build on every PR (see `.github/workflows/ci.yml`).

---

## 🗺️ Roadmap

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the phased plan and status.

---

## 📄 License

MIT © Abdullah Naseem
