# Hirepath: Applicant Tracking System

Full stack ATS. TypeScript Express REST API, PostgreSQL via Prisma, and a vanilla JavaScript single-page frontend. No frontend build step.

## Features
- Auth: scrypt-hashed passwords, HS256 signed tokens (12h), login rate limit, roles (admin can delete, recruiter cannot)
- Jobs: create roles, close/reopen, applicant counts
- Candidates: CRUD, rating 1–5, source, skills, role link, server-side search, filters, sort, pagination, CSV export
- Pipeline: drag-and-drop kanban, optimistic update, undo toast
- Resume upload (PDF/TXT/MD, 5 MB): text extracted, known skills merged into profile, file stored in Postgres (so any instance can serve it) and downloadable
- Role match score 0–100 with strengths and gaps. Uses Claude API when `ANTHROPIC_API_KEY` set, else offline keyword engine. Candidate name and protected traits never sent to the model. Result is advisory only
- Interviewer scorecards: 4 criteria (1–5), recommendation, comment. One review per interviewer per candidate (edit replaces). Average shown in table, sortable
- Email templates (invite, received, offer, rejection) with merge fields, editable before send. Sends via Resend when `RESEND_API_KEY` set; otherwise logged as simulated. Every email recorded in timeline. UI asks confirmation before sending
- Public careers page at `/careers`: lists open roles, apply form with optional resume and cover note. Applicants land in Applied with source "Careers page", get an acknowledgement email (logged in the timeline), and are rate limited (5 per IP per 10 min), honeypot protected and de-duplicated per role + email (a repeat gets the same success reply, so the form cannot reveal who applied)
- Realtime board: WebSocket at `/ws`. First message must be `{type:"auth",token}` (5 s deadline, closed when the token expires). Every successful candidate create, update or delete, plus new careers-page applications, is broadcast to all signed-in recruiters; the pipeline, dashboard and candidate list refresh themselves, and a toast announces new candidates. Your own tab ignores its own echo (`x-client` header). Clients reconnect with backoff and resync on reconnect. Works across multiple instances: events go through Postgres `LISTEN/NOTIFY`, so a change made on one instance reaches recruiters connected to any other
- Privacy: the apply form has a mandatory consent checkbox (stored as `consent_at`). Admins can **anonymise** a candidate (name, email, phone, skills, resume, notes, emails erased; stage history kept so reports stay right). `RETENTION_DAYS=N` anonymises rejected candidates automatically N days after rejection
- Email outbox: acknowledgement emails are queued in Postgres and sent by a background worker (every 15 s, several instances never double-send), retried with backoff up to 5 times; the outcome lands in the timeline
- Ops: JSON log line per API call with a request id (`X-Request-Id`, also returned on 500s), graceful shutdown, shared Postgres rate limits, CSP + HSTS
- Timeline per candidate: stage changes and recruiter notes
- Dashboard: KPIs, weekly applicants chart, step-conversion funnel, source breakdown, applicants per role, activity feed
- UX: command palette (Ctrl/Cmd+K), `N` for new candidate, dark/light theme, responsive, reduced-motion aware

## Run
Needs Node 22.18+ (native TypeScript type stripping) and PostgreSQL 16+ with `pg_trgm` and `vector` extensions available.

    createdb ats
    export DATABASE_URL=postgresql://user:pass@localhost:5432/ats
    npm install          # also runs `prisma generate`
    npm run db:deploy    # apply migrations
    npm start            # http://localhost:3000, seeds demo data into an empty database (not in production, see below)
    createdb ats_test && DATABASE_URL=postgresql://user:pass@localhost:5432/ats_test npx prisma migrate deploy
    TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/ats_test npm test

Tests wipe and reseed the database in `TEST_DATABASE_URL` (default `postgresql://ats:ats@localhost:5432/ats_test`). They ignore `DATABASE_URL` and refuse to run unless the database name ends in `_test`. Changing `prisma/schema.prisma`: `npm run db:migrate -- --name what_changed` creates a new migration.

Env: `DATABASE_URL` (required), `SHADOW_DATABASE_URL` (dev only, for `npm run db:migrate`), `PORT`, `JWT_SECRET` (required in production, 16+ chars, e.g. `openssl rand -hex 32`), `TRUST_PROXY` (proxy hops, e.g. `1`; see Deploy), `RETENTION_DAYS` (optional, see Privacy), `SEED_DEMO=1` (force demo data in production), `ADMIN_EMAIL` + `ADMIN_PASSWORD` + `ADMIN_NAME` (create the first admin in an empty production database), `ANTHROPIC_API_KEY` + `ANTHROPIC_MODEL` (optional role matching), `OPENAI_API_KEY` + `EMBEDDING_MODEL` (optional candidate embeddings), `GMAIL_USER` + `GMAIL_APP_PASSWORD` (free Gmail SMTP delivery; Gmail address is used as the sender), `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` + `EMAIL_FROM` (optional Resend delivery; requires a verified sender domain), `WS_HEARTBEAT_MS` (optional session revocation check interval; default 30000 ms), and `APPLY_LIMIT` (optional application rate limit).

## Docker
    SEED_DEMO=1 JWT_SECRET=$(openssl rand -hex 32) docker compose up --build   # http://localhost:3000, with demo data
Starts Postgres 16 (volume `pg-data`) and the app, which applies pending migrations on boot. Set `POSTGRES_PASSWORD` for anything beyond local use (avoid URL-special characters in it). CI (`.github/workflows/ci.yml`) runs migrations and tests against a Postgres service, then builds the image.
Demo logins (only when demo data is seeded, which never happens in production unless `SEED_DEMO=1`): `admin@ats.dev` / `admin123`, `recruiter@ats.dev` / `recruit123`. For a real deployment skip `SEED_DEMO` and set `ADMIN_EMAIL` and `ADMIN_PASSWORD` instead.

## Moving from the SQLite version
    npm run db:deploy
    npm i --no-save better-sqlite3
    DATABASE_URL=... npm run db:import-sqlite -- ./ats.db ./uploads
Copies users, roles, candidates, timelines, scorecards, emails and resume files into Postgres in one transaction, preserving ids. It refuses to run against a non-empty database.

## API (all but login need `Authorization: Bearer <token>`)
| Method | Path | Notes |
|---|---|---|
| POST | /api/auth/login | email, password |
| POST | /api/auth/revoke-all | revoke every current account session; signs out existing HTTP tokens and connected WebSockets |
| GET | /api/auth/me | current user |
| GET/POST | /api/jobs | list / create |
| PUT | /api/jobs/:id | edit, status open/closed |
| GET | /api/candidates | q, stage, job, source, minRating, sort, dir, page, limit |
| GET | /api/candidates/export | CSV, same filters |
| GET/PUT | /api/candidates/:id | detail + events / partial update |
| POST | /api/candidates | create |
| PUT | /api/candidates/:id/interview | schedule or clear an interview when stage is Interview |
| GET | /api/calendar.ics | export scheduled interviews; bearer token required |
| GET | /api/candidates/semantic-search?q=... | nearest candidates using pgvector cosine similarity |
| POST | /api/candidates/:id/embedding | rebuild a candidate embedding |
| POST | /api/candidates/:id/notes | add note |
| DELETE | /api/candidates/:id | admin only |
| POST/GET | /api/candidates/:id/resume | upload raw file (header `x-filename`) / download |
| POST | /api/candidates/:id/match | score candidate against assigned role |
| POST | /api/candidates/:id/scorecards | upsert caller's review |
| GET | /api/candidates/:id/email-draft?template= | rendered draft |
| POST | /api/candidates/:id/email | send + log |
| POST | /api/candidates/:id/anonymise | **admin only.** Erase personal data, keep stage history |
| GET | /api/public/jobs | **no auth.** Open roles, public fields only |
| POST | /api/public/apply | **no auth.** JSON: job_id, name, email, phone, cover, resume_name, resume_b64 (max 5 MB decoded), `consent: true` (required) |
| WS | /ws | realtime events: `{type:"candidate", action:"created"/"updated"/"deleted", id, name, src}`, and `{type:"resync"}` after the server's database listener reconnects (clients refetch) |
| GET | /health | liveness |
| GET | /api/stats | dashboard analytics |

## Deploy (Render / Railway / Fly.io)
Create a managed Postgres, set `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `TRUST_PROXY`, build with `npm install`, start with `npx prisma migrate deploy && npm start`. No persistent disk is needed: resumes live in the database. You can run several instances behind a load balancer. Seeding on first boot is serialised with a Postgres advisory lock. Set `TRUST_PROXY` to the number of proxies in front of the app (usually `1`; `2` for CDN plus load balancer). Without it every visitor shares the proxy's IP, so one person's failed logins lock everyone out and the careers-page limit applies to the whole world. Rate-limit counters live in Postgres, so all instances share them. HSTS is sent on HTTPS requests. Instances stop gracefully on SIGTERM (`/health` returns 503 while draining).

Search uses a `pg_trgm` index created by migration `20261018180000_outbox_consent_search` (`CREATE EXTENSION pg_trgm`; fine on Render, Railway, Neon, Supabase and RDS). Prisma cannot model that expression index, so it lives only in the migration SQL; keep it if you regenerate migrations. `npm run db:migrate` replays all migrations in a shadow database, so the extension must be allowed there too. Set `SHADOW_DATABASE_URL` to an empty scratch database (e.g. `postgresql://ats:ats@localhost:5432/ats_shadow`, which `docker compose up db` creates on a fresh volume with `pg_trgm` enabled). On a managed host, enable `pg_trgm` there or point the variable at a local Postgres. `pg_trgm` is a trusted extension on Postgres 13+, so a plain database owner can create it; older versions need a superuser. Never point `SHADOW_DATABASE_URL` at a database with data: Prisma wipes it.

Realtime limits: events missed while an instance's Postgres connection is down are not replayed. On reconnect the instance tells its browsers to refetch (`resync`). `LISTEN/NOTIFY` does not work through PgBouncer in transaction mode, so point `DATABASE_URL` at a direct connection.


## TypeScript, validation, semantic search, calendar and sessions

- **TypeScript source of truth:** the API is implemented in `server.ts`; `server.js` is a compatibility bridge for older scripts. Node 22.18 or newer is required for native TypeScript type stripping. `npm run build` runs the TypeScript checker after dependencies and the Prisma client have been generated.
- **Zod validation:** request schemas cover login, candidate create/update, job create/update, notes, scorecards, recruiter email, public applications, interview scheduling and semantic search. They reject extra keys and malformed input. Public role IDs may arrive as strings from HTML controls and are normalized to positive PostgreSQL integer IDs.
- **Playwright and CI:** `npm run test:e2e` checks the public careers experience, authentication boundary and health endpoint. The GitHub Actions workflow installs Chromium, runs the build, applies migrations, runs the PostgreSQL integration suite, executes browser tests and builds the Docker image.
- **pgvector candidate search:** use **Find similar** on the Candidates screen to rank candidates against a plain-language skills/experience query. A migration installs `vector`, adds a 384-dimensional embedding column and creates an HNSW cosine index. Candidate create/update and public applications trigger asynchronous embedding refresh; the search endpoint indexes older unindexed candidates in batches. With `OPENAI_API_KEY`, HirePath uses `text-embedding-3-small` at 384 dimensions (configurable through `EMBEDDING_MODEL`). Without the key, it uses deterministic local feature hashing. The fallback is lexical feature similarity, not a trained language embedding, so do not interpret it as full semantic understanding.
- **Interview scheduling/calendar:** move a candidate to the `Interview` stage, save an explicit date/time and duration, then use the interview calendar controls or call `GET /api/calendar.ics`. The feed contains scheduled interviews only, uses the real interview time and duration, and requires a bearer token.
- **Session revocation:** `POST /api/auth/revoke-all` increments the signed-in user's `token_version`. Existing bearer tokens immediately fail subsequent HTTP requests; established WebSocket sessions close when the configured heartbeat checks the changed version (30 seconds by default). Sign in again to continue. `WS_HEARTBEAT_MS` can tune the heartbeat; it is set to 1000 ms only in integration tests.

### Local setup and test safety

For the easiest local database, use Docker Compose with a PostgreSQL image that includes pgvector:

```bash
cp .env.example .env
# Replace the placeholder JWT_SECRET with a unique value, e.g. openssl rand -hex 32
# SEED_DEMO=1 enables demo users/data; remove it when setting up a non-demo instance

docker compose up --build
```

For manual installation, use Node 22.18+, PostgreSQL 16+ with both `pg_trgm` and `vector` extensions available, and set `DATABASE_URL` before installation/generation:

```bash
npm install
npm run db:deploy
npm run build
npm start
```

Run automated tests only against a disposable test database with a name ending in `_test`:

```bash
TEST_DATABASE_URL='postgresql://ats:ats@localhost:5432/ats_test' npm test
npm run test:e2e
```

The integration suite resets and reseeds every table in `TEST_DATABASE_URL`; it refuses database names that do not end with `_test`. Do not point it at production or at a database containing valuable data. The browser suite assumes the application is already running and `BASE_URL` can be set to test another local URL.

`CREATE EXTENSION vector` requires a PostgreSQL server/image with pgvector installed and a database role allowed to create the extension. Managed database providers may require enabling pgvector in their dashboard. `pg_trgm` is used by the existing candidate search index and also needs to be available when migrations run.

### Verification note

A full verification requires a successful dependency install (`npm install`), a running PostgreSQL instance with pgvector/pg_trgm, and a browser runtime for Playwright. The editing environment used to prepare this archive could not reach `registry.npmjs.org` (`EAI_AGAIN`), and it did not provide Docker or PostgreSQL. The incoming lockfile did not include all newly added development tools, so the setup and CI use `npm install` to reconcile it. Source-level syntax checks were run, but dependency-backed build, migrations, integration suite, Playwright suite and Docker image build could not be executed in this environment. CI is configured to run those checks on a network-enabled runner; do not mark the project production-verified until that pipeline passes.
