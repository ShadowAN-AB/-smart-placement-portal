# Roadmap

Plans for the next 10 features. Ordered into phases by dependency and ROI. Each feature has scope, model/API/client changes, acceptance criteria, and rough effort. Numbering matches the original brainstorm — the build order is inside each phase heading.

Effort scale: **S** = <1 day, **M** = 1–3 days, **L** = 3–7 days, **XL** = 1–3 weeks.

---

## Phase 1 — Housekeeping (finish half-built scaffolds) ✅ DONE

Shipped: `useAnalytics.js` + `AdminAnalytics.js` deleted (Option A); `ChatMessage` model + `GET`/`DELETE /api/ai/chat` endpoints added; `POST /api/ai/ask` now persists both messages; `useResumeAI` hydrates history on mount and `clearChat` calls the DELETE endpoint.

### Feature 1: Wire up admin analytics scaffolding — **S**

**Problem.** `client/src/hooks/useAnalytics.js` returns a "planned" error and is unused. `server/models/AdminAnalytics.js` exists but nothing writes to it. `AdminDashboard.jsx` bypasses the hook and calls the API directly. Two dead scaffolds.

**Scope — pick one:**
- **Option A (recommended):** Delete `useAnalytics.js` and `AdminAnalytics.js`. Analytics are live-computed in `/api/admin/analytics` and that's fine at current scale.
- **Option B:** Wire `useAnalytics` to `/api/admin/analytics`, refactor `AdminDashboard` to use it. Add a nightly `scripts/rollupAnalytics.js` that writes to `AdminAnalytics` keyed by month.

**Changes (Option A):**
- Delete: `client/src/hooks/useAnalytics.js`, `server/models/AdminAnalytics.js`
- Grep for imports and remove.

**Changes (Option B):**
- Client: `useAnalytics` calls `apiRequest('/api/admin/analytics')`. `AdminDashboard` reads from the hook.
- Server: new `server/scripts/rollupAnalytics.js` — computes per-month totals from `Application`+`Job`+`User` and upserts into `AdminAnalytics`. Add `npm run rollup --prefix server`.

**Acceptance:** No dead files; `npm run lint --prefix client` clean; admin dashboard renders unchanged.

---

### Feature 4: Persistent AI chat history — **S/M**

**Problem.** `useResumeAI.chatHistory` is `useState`-only. Refresh = gone.

**Data model.** New `server/models/ChatMessage.js`:
```
{ userId, role: 'user'|'assistant', text, fromContext?, confidence?, createdAt }
```
Index `{userId: 1, createdAt: 1}`.

**API changes.**
- `GET /api/ai/chat` — last N (default 50) messages for `req.user`.
- `POST /api/ai/ask` — after calling `askAssistant`, persist both the user message and the assistant reply. Return `{answer, messageId}`.
- `DELETE /api/ai/chat` — clear history (used by `clearChat`).

**Client changes.**
- `useResumeAI`: on mount, `GET /api/ai/chat` and hydrate `chatHistory`. `askQuestion` still updates local state optimistically. `clearChat` now hits `DELETE`.

**Acceptance:** Ask a question → refresh → history still there. Clear chat → refresh → history empty.

**Effort:** S if you skip the delete endpoint, M with it.

---

## Phase 2 — Communications infrastructure ✅ DONE

Shipped: nodemailer-based `mailer.js` (SMTP if `SMTP_HOST` set, stdout log otherwise); `Notification` model + `notifier.js` + `/api/notifications` route; `PasswordResetToken` model + `/api/auth/forgot-password` (rate-limited 5/hr) + `/api/auth/reset-password`; interview email templates (schedule/reschedule/cancel) with `.ics` attached; `useNotifications` hook + `NotificationBell` component wired into all three dashboards; ForgotPassword + ResetPassword pages.

Both #2 and #5 need email. Set the provider up once, ship both.

### Setup: choose an email provider — **S**

Recommendation: **Resend** (simple API, good free tier) or **Nodemailer + SMTP** (works with any host). Pick Resend if you don't already have SMTP.

**New env vars:** `EMAIL_PROVIDER=resend|smtp`, `RESEND_API_KEY`, `EMAIL_FROM`, plus SMTP vars if using SMTP.

**New file:** `server/utils/mailer.js` — exports `sendMail({to, subject, html, text, attachments?})`. Provider selected via env.

**Local dev:** default to a "console" provider that logs the email to stdout so you don't spam yourself while iterating.

---

### Feature 2: Email/calendar notifications for interviews — **M**

**Trigger points (in `server/routes/interviews.js`):**
- `POST /` (scheduled) → email student + recruiter with `.ics` attached.
- `PUT /:id/reschedule` → same, with note that it was rescheduled.
- `PUT /:id/cancel` → email both, no `.ics`, includes cancel reason.
- `PUT /:id/complete` → optional — probably skip, feels noisy.

**Implementation.**
- Extract `.ics` generation into a helper that returns both the string and a Buffer for attachments.
- New `server/utils/emailTemplates.js` — small string templates for each interview event.
- Fire-and-forget: wrap `sendMail` in try/catch and log; **never fail the API request because email failed**.

**Content per email:**
- Subject: `Interview scheduled: {Job Title} at {Company}`
- Body: candidate/recruiter names, date/time in student's timezone (fallback UTC), meeting type + link/location, notes.
- Attachment: `interview-<id>.ics` (Content-Type `text/calendar`).

**Acceptance:** Schedule an interview via UI → both parties receive email with a working `.ics` (opens in Google Calendar / Apple Calendar cleanly). Cancel → cancellation email received. Reschedule → update email received. Email failure does not 500 the request.

**Risks:** timezones — store scheduled time in UTC (already do), format in email using recipient's inferred zone or say "at X UTC (Y IST)" for now.

---

### Feature 5: Password reset flow — **M**

Depends on the email provider being set up.

**Data model.** New `server/models/PasswordResetToken.js`:
```
{ userId, tokenHash, expiresAt, usedAt?, createdAt }
```
Index `{tokenHash: 1}` unique, TTL index on `expiresAt` for auto-cleanup.

**API changes.**
- `POST /api/auth/forgot-password` `{email}` — always return 200 (don't leak account existence). If user exists, generate a random 32-byte token, store its SHA-256 hash, expire in 1 hour, and email a link: `${APP_URL}/reset-password?token=<raw>`.
- `POST /api/auth/reset-password` `{token, newPassword}` — hash token, find non-expired, non-used record, verify password ≥6 chars, bcrypt-hash new password, mark token `usedAt: now`.

**Client changes.**
- `AuthPage.jsx`: add a "Forgot password?" link → `/forgot-password` page (email form).
- New `/reset-password` route: reads `?token=` from URL, shows new-password form, calls `/api/auth/reset-password`.

**Acceptance:** Full round trip works. Expired tokens rejected. Used tokens rejected. Wrong token 400s.

**Risks:** rate limit `/forgot-password` (add `express-rate-limit` — e.g. 5 requests per IP per hour) to prevent email spam abuse.

---

### Feature 3: In-app notifications feed — **M**

Independent of email but should reuse the same event points.

**Data model.** New `server/models/Notification.js`:
```
{ userId, type, title, body, link?, read: false, createdAt, meta: Mixed }
```
`type` enum: `application_status`, `interview_scheduled`, `interview_rescheduled`, `interview_cancelled`, `resume_analyzed`, `job_approved`. Index `{userId: 1, read: 1, createdAt: -1}`.

**API changes.**
- `GET /api/notifications` — paged; `?unreadOnly=true`. Returns `{items, unreadCount, total}`.
- `POST /api/notifications/:id/read` — mark one read.
- `POST /api/notifications/read-all` — mark all read.

**Emit points (in existing routes):**
- `PUT /api/applications/:appId/status` → notify student.
- `POST /api/interviews`, `.../reschedule`, `.../cancel` → notify student + recruiter.
- End of `POST /api/ai/resume/analyze` → notify student.
- `POST /api/admin/approve-job/:jobId` → notify posting recruiter.

Extract into `server/utils/notifier.js` — `notify(userId, {type, title, body, link, meta})`. Same fire-and-forget pattern.

**Client changes.**
- `useNotifications()` hook — polls every 30s while tab is visible, or on-demand refetch. Later, replace with the websocket in #8.
- Bell icon component in dashboard headers (Student/Recruiter/Admin) — badge shows unread count; dropdown lists last 10 with click-to-navigate + mark-read.

**Acceptance:** Recruiter shortlists a student → student sees bell badge → click opens the application. Same for interview/analysis/approval events.

---

## Phase 3 — Feature polish ✅ DONE

Shipped: `GET /api/ai/resume/versions` + `GET /api/ai/resume/compare` endpoints; `ResumeCompareView` component + version-picker modal wired into `ResumeIntelligence`; `POST /api/applications/bulk-status` (all-or-nothing ownership check, notify per affected student); checkbox column + select-all-on-page + floating bulk action bar in `RecruiterDashboard` applicants table with optimistic updates.

Independent from Phase 2; do in any order.

### Feature 6: Resume version comparison — **M**

**Problem.** `ResumeUpload.version` exists but there's no UI to compare v1 vs v2 fit scores.

**Server: no schema changes.** `ResumeAnalysis` already links to `resumeId`; multiple analyses per user already possible.

**New endpoint:** `GET /api/ai/resume/versions` — returns `[{resumeId, version, uploadedAt, analyzedAt, filename, topScore, avgScore}, ...]` for the current user (last 5).

**New endpoint:** `GET /api/ai/resume/compare?a=<resumeId>&b=<resumeId>` — returns two analyses side-by-side with a diff object: `{skillsAdded, skillsRemoved, jobScoreDeltas: [{jobId, title, company, before, after, delta}]}`.

**Client changes.**
- In `ResumeIntelligence.jsx`: version selector at top (dropdown of last 5). "Compare with previous" button.
- New `ResumeCompareView` component — two columns of extracted data + a sortable table of job-score deltas with colored arrows.

**Acceptance:** Upload two resumes → analyze both → compare shows added/removed skills and per-job score change.

---

### Feature 7: Recruiter bulk actions on applicants — **S/M**

**Server:**
- `POST /api/applications/bulk-status` `{appIds: [...], status}` — recruiter-only; verifies **all** appIds belong to jobs owned by the recruiter (single query with `$in`); atomic `updateMany`. Return `{updated, skipped}`.

**Client:**
- `RecruiterDashboard.jsx` applicants table: add checkbox column, "select all", floating action bar with "Shortlist", "Reject", "Move to Interview" buttons.
- Add optimistic update: change status locally, refetch on error.

**Acceptance:** Select 5 pending applicants → click Shortlist → all update in one request; UI reflects change immediately.

**Risks:** if #3 (notifications) is done, bulk actions could fire 100 notifications at once — batch them per recipient or throttle.

---

## Phase 4 — Foundational bets ✅ DONE (Feature 9 fully, Feature 10 server-only)

Shipped:
- **Feature 9**: `server/utils/llm/` abstraction with `ollamaProvider` and `anthropicProvider`; selected via `LLM_PROVIDER` env. `aiExtractor.js` and `aiAssistant.js` refactored to use `getProvider()`. Regex fallback in extractor stays. `@anthropic-ai/sdk` installed. `.env.example` updated.
- **Feature 10 (partial)**: Server test scaffolding in place — Vitest 2 + Supertest + mongodb-memory-server; 20 passing tests across auth, applications (single + bulk), interviews (schedule/conflict/cancel), and match algorithm. GitHub Actions CI (`.github/workflows/ci.yml`) runs server tests, client lint, and client build on PRs to main.
- Refactor: extracted `server/app.js` factory so `server.js`, `api/index.js`, and tests share the same route wiring.

**Deferred**: client-side tests (Vitest + Testing Library + MSW). Different tooling stack, own PR.

These enable everything else. Consider #9 before deploying anywhere non-local.

### Feature 9: LLM provider abstraction (Anthropic/OpenAI adapter) — **M**

**Problem.** Ollama is local-only. Deploy this to Vercel and resume analysis silently falls back to regex forever.

**Design.**
- New `server/utils/llmProvider.js` with a common interface:
  ```
  { generateJSON({system, prompt, temperature, maxTokens}) → string,
    generateText({system, prompt, temperature, maxTokens}) → string,
    health() → {healthy, provider, model} }
  ```
- Adapters: `ollamaProvider.js` (current logic), `anthropicProvider.js` (using `@anthropic-ai/sdk` — model `claude-haiku-4-5-20251001` is a good default for cost). Optional: `openaiProvider.js`.
- Selector: `getProvider()` returns adapter based on `LLM_PROVIDER` env (`ollama|anthropic|openai`).

**Refactor:**
- `aiExtractor.js` calls `provider.generateJSON(...)` — keep the strict JSON prompt.
- `aiAssistant.js` calls `provider.generateText(...)`.
- Health endpoint delegates to `provider.health()`.

**New env vars:** `LLM_PROVIDER`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (default `claude-haiku-4-5-20251001`).

**Acceptance:** Set `LLM_PROVIDER=anthropic` + API key → resume upload works with no Ollama running. Regex fallback still triggers on API errors. Vercel deploy works end-to-end.

**Notes:**
- Use extended thinking off; JSON extraction doesn't benefit.
- Keep the regex fallback — it's the safety net if the API is down or budget is exhausted.
- Add a per-user rate limit (e.g. 5 analyses/day) to control API cost.

---

### Feature 10: Test scaffolding — **L**

**Setup.**
- Server: **Vitest** + **Supertest** + **mongodb-memory-server**. Add `server/tests/` and `npm test --prefix server`.
- Client: **Vitest** + **@testing-library/react** + **MSW** for API mocking. Add `client/tests/` and `npm test --prefix client`.

**Minimum coverage (20 tests to start):**
- Server (integration):
  - auth: signup, login, admin code required for admin, duplicate email 409.
  - jobs: student sees only approved+active; recruiter sees only own; match scoring reflects skill overlap.
  - applications: student can't apply twice (unique index); recruiter can't view other recruiter's applicants.
  - interviews: cannot double-book student in ±30 min; cancel reverts application to shortlisted.
  - match algorithm: unit tests for `calculateMatchScore` and `calculateEnhancedMatchScore` — edge cases (empty skills, zero salary).
- Client (component/hook):
  - `AuthContext` persists to localStorage; logout clears.
  - `ProtectedRoute` redirects by role.
  - `useJobs` refetches on filter change.
  - `apiRequest` attaches Bearer token; throws on non-2xx.

**CI.** Add `.github/workflows/ci.yml` — install, lint, run both test suites on PRs to `main`.

**Acceptance:** All tests pass locally and in CI; PRs blocked on red tests.

**Note:** don't try to hit 100% coverage. 20 tests covering the critical paths is worth 200 tests covering getters.

---

## Phase 5 — Nice-to-have

### Feature 8: Real-time updates via Socket.io — **L**

**Do this only after #3 (notifications) is live** — the notification feed is the natural transport for real-time.

**Server.**
- Install `socket.io`. In `server.js`, wrap Express with an HTTP server and mount `io` on it.
- Auth middleware for socket connections: read JWT from handshake `auth.token`, verify, attach `socket.userId`. Reject on failure.
- Each socket joins a room `user:<userId>` on connect.
- `server/utils/notifier.js` → after creating a `Notification`, `io.to('user:'+userId).emit('notification', doc)`.

**Client.**
- Install `socket.io-client`. New `useSocket()` hook — connects on auth, disconnects on logout, exposes `on(event, cb)`.
- `useNotifications`: subscribe to `notification` events → prepend to list + bump unread count. Drop the 30s poll.
- Optionally: broadcast application/interview updates to open dashboards so recruiter sees new applicants live.

**Vercel note.** Serverless functions do not maintain long-lived connections. If deploying: either move the server off Vercel (Railway/Fly/Render) **or** use a managed pub/sub like Pusher/Ably. Document the choice; don't silently break prod.

**Acceptance:** Recruiter shortlists a student → student sees the bell badge appear within 1s without refresh.

---

## Suggested sprint plan

| Sprint | Ship | Effort |
|---|---|---|
| 1 | #1 wiring, #4 chat persistence | ~2 days |
| 2 | Email provider + #2 interview emails | ~3 days |
| 3 | #5 password reset, #3 in-app notifications | ~4 days |
| 4 | #6 resume compare, #7 bulk actions | ~4 days |
| 5 | #9 LLM abstraction (unblocks prod deploy) | ~3 days |
| 6 | #10 test scaffolding + CI | ~5 days |
| 7 | #8 real-time (only if staying on the platform) | ~5 days |

Total: ~4–5 weeks of focused work for all 10.

---

## Cross-cutting concerns to track

These affect multiple features — flag when relevant.

- **Rate limiting.** Add `express-rate-limit` before Phase 2 (needed for `/forgot-password` and `/api/ai/ask`).
- **Env-var docs.** Every new env var must be added to `server/.env.example` in the same PR.
- **Route parity.** New routes in `server/server.js` must also be mounted in `api/index.js` — CI test that both files export the same route set would catch drift (add during #10).
- **`server/uploads/` on Vercel.** Every upload-adjacent feature must handle `/tmp` being ephemeral. Long-term: move to S3/R2.
