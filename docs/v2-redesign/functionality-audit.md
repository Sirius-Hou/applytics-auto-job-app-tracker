# Applytics V2 Functionality Audit

## Scope and baseline

This document records the behavior implemented on the `redesign-v2` branch before any V2 presentation work. It is descriptive, not aspirational. The V2 interface may reorganize the experience, but it must preserve the behavior called out under **FUNCTIONALITY FREEZE**.

Applytics is a private, multi-user job-application ledger. A user pastes a job URL and full job description, asks an OpenAI-backed parser for structured data, reviews and corrects that data, saves it to PostgreSQL, and then tracks the application through a dated status timeline. Every application read and mutation is scoped to the authenticated user.

## 1. Product functionality inventory

### 1.1 Authentication and account lifecycle

- On startup, the client calls `GET /api/auth/session`. While it is unresolved the UI shows `Loading Applytics…`; a 200 response enters the application and any failure/401 shows authentication.
- Email/password registration accepts an optional display name, normalized email, and a password of 5–200 characters. Registration creates a 30-day session and signs the user in immediately.
- The first registered account claims legacy applications whose `user_id` is null. Later accounts start with independent data.
- Email/password sign-in accepts any non-empty password in the UI; the server verifies the scrypt hash and returns a generic incorrect-email-or-password error.
- Google Sign-In is conditionally rendered from `GOOGLE_CLIENT_ID`. The backend verifies the Google ID token and verified email. It links an existing email account to the Google subject when possible or creates a new user.
- Sessions use random bearer tokens stored only as SHA-256 hashes in `auth_sessions`. The browser receives an HTTP-only, SameSite=Lax cookie; it is Secure in production. Sessions expire after 30 days.
- Sign out deletes the current server-side session and clears the cookie.
- Public password recovery accepts an email but always returns a generic message to avoid account enumeration. It invalidates older unused tokens, creates a random single-use token, stores only its SHA-256 hash, and expires it after 30 minutes.
- Password-reset email is delivered through Resend in production. Development/test mode can return a local reset URL when email credentials are absent.
- `/reset-password?token=...` validates the token before showing the password form. Missing, expired, used, or invalid tokens show a terminal invalid-link state instead of the form.
- Completing a password reset updates the password, consumes all outstanding reset tokens, and deletes all sessions for that user. The user must sign in again.
- Settings supports changing a password using current password, new password, and client-side confirmation. The server independently validates the current password and the new-password minimum length. A Google-only account without a password is directed to email reset.
- Settings can request a reset email for the currently authenticated account. The protected endpoint derives the email from the session rather than trusting a client-supplied address.
- Password-change failures render inside the modal. An incorrect current password marks that input invalid. Success closes the modal and shows a transient top-level toast.
- Account deletion requires exact server-validated confirmation text `DELETE`. Deletion removes the user, sessions, reset tokens, applications, events, and now-unreferenced job/company/skill records in a transaction. Shared records still referenced by another application are retained.

### 1.2 Application list and dashboard

- The authenticated landing view is **My Applications**.
- A three-card animated statistic carousel shows total applications, applications within one month, and applications within one year. It uses three separate `GET /api/applications?limit=1...` calls and includes arrows and direct dot navigation.
- The application list is fetched with a 200 ms debounce whenever filters, page, page size, view revision, or user changes.
- The table shows role/title, company, employment type, first location country code, work arrangement, current status, application date, and a detail control.
- Clicking the title or chevron fetches the complete application and switches the in-memory view to detail.
- Default pagination size is 25; supported sizes are 10, 25, 50, and 100. Previous/next controls and page count are computed from the returned total.
- The UI shows record count, loading copy, empty state, no-match state, and a global API error.
- Default sort is `recently_updated`. Other sorts are newest applied, oldest applied, company A–Z, and status.

### 1.3 Search and filtering

Primary filters:

- Job title substring
- Company substring
- Country multi-select (UI currently offers US, CA, CN)
- Employment type multi-select

Advanced filters:

- Application status multi-select
- Work setting multi-select
- Recruiting term multi-select
- Applied within 1 day, 1 week, 1/2/3/6 months, or 1/2 years
- Application date from and to (inclusive end date)
- Application year
- Location/state/province free-text substring

Additional backend-supported filters not exposed by the current list UI:

- General full-text query `q` across title/raw JD, company, skills, and key requirements
- Exact normalized skill
- Role tag
- Interview-only status set

Active filters can be cleared as a group. Changing a filter resets pagination to page 1. All filter SQL is parameterized and begins with the current `user_id`.

### 1.4 Add application and AI-assisted capture

The current UI presents a three-stage mental model: paste posting, review/correct, save to ledger.

1. The user supplies a required HTTP(S) job URL and full job description.
2. `Parse with AI` becomes available when both values are present. It calls `POST /api/parse` and displays `Parsing with AI…` while the shared busy state is active.
3. The backend submits only the raw JD to the parser. The route then attaches the user-supplied original URL, exact raw JD, null canonical URL, parser model, and parser version to the structured response.
4. The complete parsed object is held only in `Add` component state until save.
5. The user can review and edit company, title, employment type, recruiting term/year, work setting, canonical URL, one or two role tags, locations, compensation, requirement sections, skills, years-of-experience rule, initial status, application date, and notes.
6. Locations, requirement sections, skills, compensation, and explicit experience can be added or removed before save.
7. `POST /api/applications` validates the full object and persists it transactionally. It also creates the initial timeline event using the selected initial status and application date.
8. Success opens the new detail view, increments list/stat revision, and shows `Application added to your list.` for 3.5 seconds.

The original JD remains exactly as pasted in `rawJd`. Editing the URL or raw text after parsing clears the parsed result, forcing a new parse before save.

### 1.5 Parsed and persisted job information

The review object includes:

- Company and job title
- Employment category: internship, full-time, new grad, co-op, part-time, contract, temporary, unknown
- Recruiting term: summer, fall, winter, spring, unknown
- Optional recruiting year
- Work arrangement: onsite, hybrid, remote, unknown
- Original and optional canonical URLs
- Exact raw JD
- One or two role-summary tags
- Ordered locations with original text, city, region/state/province, and country code
- Optional compensation currency, minimum, maximum, period, and verbatim source text
- Ordered requirement sections with heading, type, verbatim content, and display order
- Minimum and preferred key requirements
- Deduplicated skills with twelve-type taxonomy and minimum/preferred/other level
- Optional explicit experience range and verbatim source text
- Parser model and parser version

### 1.6 Application detail and editing

- The detail header displays company, title, non-unknown employment/term/year/work-setting metadata, and current status.
- Posting details display source links, role focus, all locations, compensation, explicit years of experience, core/minimum skills, and preferred/other skills.
- Job requirements preserve section headings and render newline/bullet-like content as bullet lists.
- Full original JD is available in a collapsed `<details>` element and preserves whitespace.
- Additional Application Notes allows editing only application date and notes. Existing structured job fields are not editable after save in the current API/UI.
- Saving date/notes patches the application and refreshes detail data. Changing application date does not rewrite event dates.
- An application can be permanently deleted after a browser confirmation. Its events cascade; its job and company are removed only if no other application references them.

### 1.7 Application timeline and status

- Creation always inserts an initial timeline event.
- Events are returned newest first by `occurred_at`, then insertion sequence.
- The current application status is the event type with the latest date/sequence.
- A collapsed **Update Application Status** form adds a dated event with status and notes.
- Existing events can be edited inline, including type, date, and notes.
- Existing events can be deleted after confirmation.
- Every event add/edit/delete locks and owner-checks the application, recomputes current status, updates `applications.updated_at`, and returns refreshed full detail.
- If all events are removed, current status falls back to `SAVED`.
- The legacy note `Initial application record` is suppressed in display; current creation now stores an empty initial note.

### 1.8 Taxonomies

Application statuses:

`SAVED`, `APPLIED`, `OA`, `RECRUITER_SCREEN`, `PHONE_SCREEN`, `TECHNICAL_INTERVIEW`, `ONSITE_INTERVIEW`, `FINAL_INTERVIEW`, `OFFER`, `REJECTED`, `WITHDRAWN`, `GHOSTED`.

Skill types:

`PROGRAMMING_LANGUAGE`, `FRAMEWORK`, `LIBRARY`, `TOOL`, `PLATFORM`, `DATABASE`, `CLOUD`, `OPERATING_SYSTEM`, `PROTOCOL_API`, `HARDWARE`, `TECHNICAL_DOMAIN`, `ENGINEERING_PRACTICE`.

Role tags:

`GENERAL_SWE`, `FRONTEND`, `BACKEND`, `FULL_STACK`, `MOBILE`, `DESKTOP`, `EMBEDDED`, `FIRMWARE`, `SYSTEMS`, `INFRASTRUCTURE`, `PLATFORM`, `CLOUD`, `DEVOPS`, `SRE`, `DATA_ENGINEERING`, `DATA_SCIENCE`, `MACHINE_LEARNING`, `AI_AGENT`, `AI_INFRASTRUCTURE`, `MLOPS`, `GRAPHICS`, `GAMING`, `ROBOTICS`, `SECURITY`, `NETWORKING`, `DATABASE`, `COMPILERS`, `DEVELOPER_TOOLS`, `QA_TESTING`, `AUTOMATION`.

### 1.9 Backend capabilities not surfaced in the current UI

- `GET /api/skills` returns per-user skill frequency and minimum/preferred/other counts.
- `GET /api/roles` returns per-user role-tag frequency.
- `GET /api/analytics/overview` returns total non-saved applications plus country, company, month, and role breakdowns for a period/custom date range and optional company filter.
- `npm run ai:parse` parses a JD file or stdin without saving.
- `npm run db:backup` exports every public-schema table in one repeatable-read, read-only transaction to a timestamped JSON file and SHA-256 checksum. Backups are ignored by Git.

These are real backend features, but they must not be represented as existing user-facing screens in the V2 baseline.

## 2. Major user-flow map

### Startup and authentication

`Load SPA` → `GET /api/auth/session` → loading state → authenticated app or auth screen.

`Create Account` → enter optional name/email/password → client minimum-length gating → `POST /api/auth/register` → user + cookie → My Applications.

`Sign In` → enter email/non-empty password → `POST /api/auth/login` → server hash verification → user + cookie → My Applications.

`Google Sign-In` → GIS credential callback → `POST /api/auth/google` → Google token verification/account link or creation → cookie → My Applications.

`Sign Out` → `POST /api/auth/logout` → server session deletion/cookie clear → reset local detail/view/user → auth screen.

### Password recovery

`Forgot password` → enter email → `POST /api/auth/forgot-password` → generic success → Resend email → `/reset-password?token=...` → token validation → new/confirm password → `POST /api/auth/reset-password` → all sessions invalidated → sign-in screen.

### Add application

`Add Application` → enter URL + raw JD → `POST /api/parse` → OpenAI structured output → backend validation/source-grounding/normalization → editable review form → choose initial status/date + notes → `POST /api/applications` → transactional inserts + initial event → full application response → detail view + toast.

### Find and inspect application

`My Applications` → debounced filter query → `GET /api/applications` → table/pagination → select row → `GET /api/applications/:id` → in-memory detail view.

### Update application record

`Detail` → edit application date/notes → `PATCH /api/applications/:id` → refreshed detail. Structured job fields are not updated by this flow.

### Maintain status timeline

`Detail` → expand Update Application Status → status/date/notes → `POST /api/applications/:id/events` → recompute current status → refreshed detail.

`Edit event` → inline event form → `PATCH /api/applications/:id/events/:eventId` → recompute status → refreshed detail.

`Delete event` → confirm → `DELETE /api/applications/:id/events/:eventId` → recompute/fallback status → refreshed detail.

### Delete application

`Detail` → delete control → browser confirm → `DELETE /api/applications/:id` → application/events removed; orphan job/company cleanup → list view + toast.

### Change password

`Settings` → Change password modal → current/new/confirm → inline validation → `POST /api/auth/change-password` → current hash verification + update → modal closes → transient success toast.

### Delete account

`Settings` → Delete account modal → type exact `DELETE` → `DELETE /api/auth/account` → transactional user/data cleanup + cookie clear → auth screen.

## 3. Frontend route/page inventory

The application is an SPA served by Express. It does **not** use a routing library.

| URL/path | Effective component/view | Auth | Purpose and dependencies |
|---|---|---:|---|
| `/` (and most SPA fallback paths) | `App` → `Auth` when signed out | No | Login, registration, forgot-password modes; uses auth config/session/login/register/forgot/Google endpoints. |
| `/` | `App` view `list` | Yes | My Applications, statistic carousel, filters, sort, pagination; uses application list queries. |
| `/` | `App` view `add` | Yes | Paste, AI parse, review/correct, save; uses parse and create endpoints. |
| `/` | `App` view `detail` | Yes | Full record, notes/date edit, timeline CRUD, application deletion; detail exists only in React memory and has no deep-link URL. |
| `/` | `App` view `settings` | Yes | Account metadata, change/reset password, sign out, delete account; also exists only in React memory. |
| `/reset-password?token=...` | `Auth` mode `reset` | No | Pre-validates a reset token and, when valid, changes the password. |

There are no URL-addressable routes for list/add/detail/settings and no browser-history integration for view transitions. Refreshing any in-memory app view returns to list after session restoration. A V2 router can be introduced only with careful compatibility testing of `/reset-password`, the Express wildcard fallback, auth gating, and state-fetch timing.

## 4. AI Job Description parsing: end-to-end trace

1. **Input UI:** `src/components/Add.tsx` stores `raw` and `url`. Editing either clears any previous parsed `job` state.
2. **Frontend submission:** `Parse with AI` calls `request<Job>('/parse', 'POST', { rawJd: raw, originalUrl: url })` through the shared `run` busy/error wrapper.
3. **Route validation:** `server/routes.ts` validates input with `parseInput` (raw JD 1–200,000 characters and HTTP(S) URL), then calls `parseJobDescription(rawJd)`.
4. **Configuration:** `server/ai/job-parser/config.ts` loads `.env.openai` plus process environment and validates API key, model, reasoning effort, output-token cap, and 1–300 second timeout. Environment variables override the file.
5. **Instructions:** `agent.ts` loads `JOB_PARSER_AGENT.md` and `CORRECTIONS.md` on each parse.
6. **OpenAI request:** `POST https://api.openai.com/v1/responses` uses the configured model, untrusted-data tags around the JD, `store: false`, configured reasoning effort/token limit, and strict `json_schema` output from `schema.ts`. The request is terminated by `AbortSignal.timeout(OPENAI_TIMEOUT_MS)`; deployed default is 60 seconds.
7. **Response handling:** HTTP errors, non-completed responses, refusals, missing output, malformed JSON, and schema violations throw errors.
8. **Post-processing:** `agent.ts` restores verbatim requirement sections from the source, fills missing concrete key requirements, normalizes/deduplicates/sorts skills, restores a compensation range from source text when needed, and asserts source-backed verbatim fields.
9. **Route response:** The route adds exact `rawJd`, original URL, null canonical URL, returned model metadata, and parser version `v1`.
10. **Review state:** `Add.tsx` renders the returned object as editable controlled fields. No database write has happened yet.
11. **Persistence:** Only `Save application` sends the reviewed object through `createSchema` to `createApplication`, which inserts all relational data and the initial timeline event in one transaction.

### Parsing files that must remain protected

- `server/ai/job-parser/agent.ts`
- `server/ai/job-parser/config.ts`
- `server/ai/job-parser/schema.ts`
- `server/ai/job-parser/JOB_PARSER_AGENT.md`
- `server/ai/job-parser/CORRECTIONS.md`
- `shared/contracts.ts` parser/application schemas
- `server/routes.ts` `/parse` composition
- `server/repositories/applications.ts` transactional persistence mapping

A UI redesign may replace the form rendering and progress presentation. It must preserve the exact raw JD, request/response semantics, editable pre-save checkpoint, schema completeness, timeout/error propagation, and save-after-review boundary.

## FUNCTIONALITY FREEZE

The following behavior is frozen for V2 unless a separate, explicitly approved functional change is made:

- Email/password registration and login rules (`src/components/Auth.tsx`, `server/auth.ts`, `server/routes.ts`).
- Conditional Google Sign-In, token audience verification, verified-email requirement, and account linking (`Auth.tsx`, `auth.ts`).
- 30-day HTTP-only cookie session behavior and startup session restoration (`auth.ts`, `main.tsx`).
- Forgot/reset password privacy response, 30-minute single-use tokens, email delivery, reset-link prevalidation, and invalidation of all sessions after reset (`auth.ts`, `email.ts`, `Auth.tsx`).
- Current-password verification, inline mismatch errors, protected reset-email request, and successful password-change toast (`Settings.tsx`, `auth.ts`, `routes.ts`, `main.tsx`).
- Exact `DELETE` confirmation and transactional account cleanup without deleting shared data (`Settings.tsx`, `auth.ts`).
- Per-user scoping for every application/detail/stat/event query and mutation (`routes.ts`, `applications.ts`).
- Raw JD preservation and original HTTP(S) URL validation (`Add.tsx`, `contracts.ts`, `routes.ts`).
- OpenAI Responses API call, strict schema, `store:false`, configured timeout, validation, source-grounding, normalization, and correction instructions (`server/ai/job-parser/*`).
- The mandatory human review/edit checkpoint before any parsed job is saved (`Add.tsx`).
- Complete application creation transaction, including company normalization, job relations, deduplicated shared skills, role tags, initial status, and initial event (`applications.ts`).
- Existing application-list filter semantics, multi-value encoding, date boundaries, owner scope, sorting, totals, and pagination (`main.tsx`, `common.tsx`, `contracts.ts`, `applications.ts`).
- Full application retrieval and field mapping (`applications.ts#getApplication`, `contracts.ts`).
- Application date/notes update semantics; changing applied date does not rewrite event history (`Detail.tsx`, `applications.ts#updateApplication`).
- Timeline ordering, CRUD, application row locking, current-status recomputation, and `SAVED` fallback (`Detail.tsx`, `applications.ts`).
- Application deletion and conditional orphan job/company cleanup (`Detail.tsx`, `applications.ts`).
- Database tables, foreign keys, check constraints, migrations, and transaction boundaries (`server/db/**`).
- Existing API paths, HTTP methods, validation, error status semantics, and response shapes (`routes.ts`, `contracts.ts`).
- Origin checks, JSON size limit, production static serving, SPA fallback, and shared error handling (`server/app.ts`).
- Existing backend-only analytics, skill/role statistics, CLI parser, and backup behavior even if V2 does not expose them immediately.

## 5. Confirmed ambiguities and baseline limitations

- No UI exists for editing structured job fields after save. V2 must not silently imply that such edits persist unless a separate backend feature is added.
- The generic `q`, skill, role, interview-only filters and analytics endpoints exist but are not used by the current UI.
- List statistics count all records, including `SAVED`; `/analytics/overview` explicitly excludes `SAVED`. These are separate semantics.
- Frontend view state is not URL-addressable, so detail pages cannot currently be bookmarked or restored after refresh.
- The shared `busy` and global `error` state spans unrelated operations in `main.tsx`; some component-local modal errors already bypass it.
- `README.md` still says public registration lacks password recovery, but recovery is implemented. Code and tests are the baseline.
- The UI labels non-minimum skills as preferred/good-to-have, while the schema/database can still contain `OTHER` for parser output and statistics.
- Deleting one application removes its orphan job/company but does not explicitly garbage-collect now-unused global skill rows; account deletion does clean candidate orphan skills.

