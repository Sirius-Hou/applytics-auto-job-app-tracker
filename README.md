# Applytics

Applytics is a private, AI-assisted job application ledger. Paste a job description, review structured details extracted by OpenAI, and keep the original posting, requirements, skills, compensation, locations, notes, and application timeline in one searchable workspace.

## Features

- AI parsing with a strict JSON schema and source-text validation
- Editable review step before anything is saved
- Full original job descriptions preserved verbatim
- Search, multi-select filters, date ranges, sorting, pagination, and summary counts
- Application timelines with editable and removable events
- Email/password accounts with secure server sessions
- Optional Sign in with Google
- Per-user data isolation in PostgreSQL
- Responsive React interface served by the Express API

## Stack

- React 19, TypeScript, Vite, Motion
- Express and Zod
- PostgreSQL with ordered SQL migrations
- OpenAI Responses API
- Google Identity Services

## Local setup

Requires Node.js 22 or newer.

```powershell
npm install
npm run db:local
```

Keep the database terminal open. It starts a local PostgreSQL instance on `127.0.0.1:55432`, stores its files under the ignored `.local` directory, and writes the generated connection string to `.env`.

Copy `.env.openai.example` to `.env.openai` and add your OpenAI API key. Then start the application in another terminal:

```powershell
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). Select **Create Account** on first launch. The first account claims any records created before authentication was introduced; later accounts receive independent empty workspaces.

To use an existing PostgreSQL server, copy `.env.example` to `.env`, set `DATABASE_URL`, and run `npm run migrate` instead of `npm run db:local`.

## Configuration

Application and database settings belong in `.env`:

```env
DATABASE_URL=postgresql://user:password@host:5432/job_tracker
PORT=3001
HOST=127.0.0.1
GOOGLE_CLIENT_ID=optional-web-client-id.apps.googleusercontent.com
```

OpenAI settings belong in `.env.openai` locally, or in ordinary server environment variables when deployed:

```env
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-6-luna
OPENAI_REASONING_EFFORT=medium
OPENAI_MAX_OUTPUT_TOKENS=6000
OPENAI_TIMEOUT_MS=60000
```

Both secret files are ignored by Git. Never commit database credentials, Google credentials, or an OpenAI API key.

For Google login, create a Google OAuth 2.0 Web client and add the applicable authorized JavaScript origins:

```text
http://127.0.0.1:5173
https://applytics.siriushou.com
```

Email/password login works without Google configuration. Passwords are stored as salted scrypt hashes. Sessions use HTTP-only, SameSite cookies and become Secure in production.

## Commands

| Command                      | Purpose                                            |
| ---------------------------- | -------------------------------------------------- |
| `npm run dev`                | Start the Vite and Express development servers     |
| `npm run db:local`           | Start the persistent local PostgreSQL instance     |
| `npm run migrate`            | Apply pending database migrations                  |
| `npm run ai:parse -- <file>` | Parse a JD from the command line without saving it |
| `npm test`                   | Run contract and query tests                       |
| `npm run test:db`            | Run isolated PostgreSQL integration tests          |
| `npm run build`              | Type-check and build the frontend                  |
| `npm start`                  | Apply migrations and serve the production build    |
| `npm run format`             | Format source files                                |

## AI parser

The parser contract lives in [`server/ai/job-parser/JOB_PARSER_AGENT.md`](server/ai/job-parser/JOB_PARSER_AGENT.md). Confirmed reusable corrections live in [`server/ai/job-parser/CORRECTIONS.md`](server/ai/job-parser/CORRECTIONS.md), and the strict structured-output schema lives in [`server/ai/job-parser/schema.ts`](server/ai/job-parser/schema.ts).

The parser extracts identity, employment type, recruiting term and year, work setting, locations, compensation, requirement sections, key requirements, ATS skills, role direction, and explicit experience requirements. Verbatim fields are checked against the original JD. Saving occurs only after the user reviews the result.

## Data model and security

Applications belong to users. Every application query, statistic, detail view, update, timeline mutation, and deletion is scoped to the authenticated user. Jobs retain their original text and structured analysis; related tables store locations, requirements, normalized skills, role tags, and timeline events.

All writes are validated with Zod and parameterized SQL. Application creation is transactional. The newest timeline event determines the current status. Database changes are versioned in [`server/db/migrations`](server/db/migrations); add a new numbered migration instead of editing an applied migration.

Public registration currently does not verify email ownership or provide password recovery. Add email verification, password reset, authentication rate limiting, and production monitoring before opening registration broadly.

## Deployment

The production build is served by Express, so Applytics can run as one Node web service plus one managed PostgreSQL database. Set the environment variables above, run `npm run build`, and use `npm start` as the start command. In production the server binds to `0.0.0.0` automatically and applies pending migrations before starting.

The production domain is `applytics.siriushou.com`. DNS is managed by Cloudflare with a CNAME from `applytics` to `applytics.onrender.com`; the record stays DNS-only so Render can manage the application certificate and origin directly. Render hosts the Node web service, while Supabase provides PostgreSQL. Keep all secrets server-side, configure the production Google origin, and back up the database before migrations.

The included [`render.yaml`](render.yaml) defines the web service without embedding credentials. Render prompts for the Supabase connection string, OpenAI key, and optional Google client ID during setup.
