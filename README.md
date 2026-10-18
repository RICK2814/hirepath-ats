<div align="center">

# HirePath ATS <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

### A modern, full-stack Applicant Tracking System

Manage job openings, candidates, hiring stages, interview feedback, resumes, and recruiter communications from one workspace.

[![CI](https://github.com/RICK2814/hirepath-ats/actions/workflows/ci.yml/badge.svg)](https://github.com/RICK2814/hirepath-ats/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-22.18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

</div>

---

## Contents <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

- [Overview](#overview)
- [Animated workflow demo](#animated-workflow-demo)
- [Features](#features)
- [Using the public Careers Page](#using-the-public-careers-page)
- [Technology stack](#technology-stack)
- [Architecture](#architecture)
- [Repository structure](#repository-structure)
- [Requirements](#requirements)
- [Quick start with Docker](#quick-start-with-docker)
- [Manual local setup](#manual-local-setup)
- [Configuration and environment variables](#configuration-and-environment-variables)
- [Email provider setup](#email-provider-setup)
- [Authentication and roles](#authentication-and-roles)
- [Database and migrations](#database-and-migrations)
- [API reference](#api-reference)
- [Testing and quality checks](#testing-and-quality-checks)
- [Deployment](#deployment)
- [Security and privacy](#security-and-privacy)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Overview <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

HirePath ATS is a full-stack applicant tracking system built with **Node.js, TypeScript, Express, PostgreSQL, Prisma, and a lightweight browser frontend**. It provides a hiring pipeline for recruiters and admins, from publishing open roles and capturing applications to reviewing candidates and coordinating interviews.

The frontend is served from `public/`; it does not need a separate React or frontend build step. The Express API and browser interface share the same application.

## Animated workflow demo <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

The animation below illustrates the end-to-end hiring flow in HirePath ATS. It loops automatically on GitHub—no setup or playback button needed.

<p align="center">
  <img src="assets/hirepath-workflow.svg" alt="Animated HirePath ATS workflow: publish a job, receive an application through the public Careers Page, and see the candidate automatically appear in the ATS pipeline." width="100%" />
</p>

<p align="center"><sub><a href="assets/hirepath-workflow.svg">Open the animation asset</a> · Illustration of the product workflow, not a live feed of production data.</sub></p>

**Workflow at a glance:** publish an open role in **Jobs** → share the [public Careers Page](https://hirepath-ats.vercel.app/careers) → a candidate submits the form → their application is saved to the ATS and can be reviewed under **Candidates** or **Pipeline**.

## Features <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

### Hiring workflow <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />
- **Jobs:** create roles with department, location, description, and open/closed status.
- **Candidate management:** add, edit, search, filter, sort, paginate, and export candidate records to CSV.
- **Hiring pipeline:** track candidates through `Applied`, `Screening`, `Interview`, `Offer`, `Hired`, and `Rejected`.
- **Candidate timeline:** keep stage changes, recruiter notes, scorecards, and email activity together.
- **Resume handling:** upload PDF, TXT, or Markdown resumes up to 5 MB. Resume text is extracted and known skills can be added to the candidate profile.
- **Interview scheduling:** store an interview date and duration, then export scheduled interviews as an authenticated iCalendar feed.

### Candidate evaluation <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />
- **Interview scorecards:** rate Technical, Communication, Problem solving, and Culture add; save a recommendation and evidence-based comments.
- **Role matching:** get a 0–100 role-match score, summary, strengths, and skill gaps. Uses Anthropic when configured, otherwise a local keyword-based fallback.
- **Similar-candidate search:** search candidate profiles with pgvector cosine similarity. OpenAI embeddings are optional; without an OpenAI key, HirePath uses deterministic feature hashing. The fallback is lexical similarity, not a trained semantic model.

### Email and careers page <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />
- **Email templates:** prepare interview invitations, application acknowledgements, offers, and rejections. Review and edit drafts before sending.
- **Email providers:** optional integrations for Brevo, Gmail SMTP, Plunk, and Resend are available in the server code. Provider accounts, sender permissions, and environment variables must be configured before delivery will work.
- **Public careers page:** `/careers` lists open roles and accepts applications without requiring a recruiter account.
- **Application safeguards:** the public application form requires consent, applies a rate limit, includes a honeypot, and avoids revealing whether a duplicate application already exists.
- **Email outbox:** application-acknowledgement emails are queued and retried by the worker in long-running Node deployments. Serverless deployments may need a separate scheduled/worker process for queued email processing.

### Operations and security <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />
- Passwords are stored as scrypt hashes; application API sessions use signed, short-lived tokens.
- Clerk authentication is supported when both Clerk keys are configured. Without Clerk, the legacy email/password login is available.
- Request payloads are validated with Zod.
- Security headers, request IDs, rate limiting, session revocation, and graceful shutdown are implemented.
- Candidate anonymisation removes personal information and associated derived data while preserving stage history for reporting.
- PostgreSQL `LISTEN/NOTIFY` distributes candidate changes between application instances in long-running deployments.

## Using the public Careers Page <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

**Production page:** [https://hirepath-ats.vercel.app/careers](https://hirepath-ats.vercel.app/careers)

Share this URL with applicants. It is a separate public-facing page, not a menu inside the recruiter dashboard.

### Recruiter workflow <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

1. Sign in to HirePath ATS and open **Jobs**.
2. Create the role with its title, department, location, and description. Make sure the role is marked **Open**.
3. Share the Careers Page URL above with candidates.
4. When a candidate submits the application form, HirePath validates the submission and saves the application to the PostgreSQL database. The candidate should then appear in the ATS candidate list/pipeline with the `Applied` stage. **You do not need to manually add candidates who applied through this form.**
5. Review the application in **Candidates** or **Pipeline** and continue the hiring process there.

The public form collects the applicant's name and email, with optional phone number, resume, and additional message. Applicants must accept the data-consent checkbox to submit.

### When manual entry is needed <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

Candidates who contact you through email, referrals, LinkedIn, or another job portal will not automatically appear in HirePath unless a separate integration/import flow is configured. Add those records manually using the dashboard's candidate form. Avoid creating a duplicate record for someone who has already applied through the Careers Page.

### Public-access deployment check <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

Before sharing the URL, open it in a private/incognito browser window where you are **not** signed in to Vercel. The Careers Page and its public application endpoint must be reachable without recruiter login. If Vercel Deployment Protection or SSO blocks the page, adjust the deployment's public-access configuration before sharing it; keep recruiter dashboard and protected APIs secured. The `/careers` page and `/api/public/jobs` and `/api/public/apply` endpoints are the public application flow.

## Technology stack <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

| Area | Technology |
|---|---|
| Runtime | Node.js 22.18+ |
| API | Express 5, TypeScript |
| Frontend | Vanilla JavaScript, HTML, CSS |
| Database | PostgreSQL 16+ |
| ORM and migrations | Prisma 7 |
| Input validation | Zod |
| Realtime updates | WebSocket and PostgreSQL `LISTEN/NOTIFY` |
| Authentication | Built-in password authentication or optional Clerk |
| Resume parsing | `pdf-parse` plus text-file parsing |
| Role matching | Anthropic API (optional) or local keyword matching |
| Similarity search | pgvector; OpenAI embeddings optional |
| Email delivery | Brevo, Gmail SMTP, Plunk, or Resend |
| Testing | Node integration tests, Playwright |
| Deployment | Vercel configuration and Docker |

## Architecture <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

```mermaid
flowchart TD
    Browser[Recruiter / Admin Browser] --> Web[Frontend: public/]
    Web --> API[Express API: server.ts]
    Applicant[Public Applicant] --> Careers[Careers Page: /careers]
    Careers --> API
    API --> Validate[Zod Validation]
    Validate --> Auth[Authentication and Roles]
    Auth --> Prisma[Prisma]
    Prisma --> DB[(PostgreSQL)]
    API --> Email[Email Provider API / SMTP]
    API --> Match[Optional Anthropic / OpenAI APIs]
    API --> Vector[pgvector Similarity Search]
```

## Repository structure <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

```text
.
├── .github/
│   └── workflows/
│       └── ci.yml                 # Build, database tests, Playwright, Docker build
├── e2e/
│   └── smoke.spec.ts              # Browser-level smoke tests
├── prisma/
│   ├── migrations/                # Versioned SQL migrations
│   └── schema.prisma              # PostgreSQL data model
├── public/
│   ├── index.html                 # Main ATS interface
│   └── careers.html               # Public careers and application page
├── scripts/
│   ├── db-init.sql                # Local PostgreSQL initialization
│   ├── import-sqlite.js            # Legacy SQLite data import helper
│   └── postgenerate.js             # Prisma post-generation helper
├── src/
│   ├── runtime.ts                 # Zod request schemas and validation
│   ├── runtime.js                 # Runtime compatibility file
│   └── types/
│       └── express.d.ts           # Express request type extensions
├── .env.example                   # Example local environment settings
├── .dockerignore
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── LICENSE
├── package.json
├── package-lock.json
├── playwright.config.ts
├── prisma.config.ts
├── README.md
├── RELEASE_NOTES.md
├── server.ts                      # Main application/API implementation
├── server.js                      # Compatibility bridge
├── test.js                        # Integration tests
├── tsconfig.json
└── vercel.json                    # Vercel framework configuration
```

## Requirements <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

- **Node.js 22.18 or newer** for native TypeScript type stripping.
- **PostgreSQL 16 or newer** with `pgvector` and `pg_trgm` available.
- **Docker and Docker Compose** for the quickest local setup, or a local PostgreSQL installation for manual setup.
- API credentials only for optional integrations you plan to use (Clerk, Brevo, Gmail SMTP, Plunk, Resend, Anthropic, or OpenAI).

## Quick start with Docker <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

Docker Compose starts PostgreSQL with pgvector and the HirePath application.

1. Clone the repository and enter it:

   ```bash
   git clone https://github.com/RICK2814/hirepath-ats.git
   cd hirepath-ats
   ```

2. Create a local environment file:

   ```bash
   cp .env.example .env
   ```

3. Change `JWT_SECRET` in `.env` to a unique random secret. For example, with Node.js:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. Start the services:

   ```bash
   docker compose up --build
   ```

5. Open [http://localhost:3000](http://localhost:3000).

The example environment file enables demo data for local evaluation. The demo accounts are:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@ats.dev` | `admin123` |
| Recruiter | `recruiter@ats.dev` | `recruit123` |

**Demo credentials are for local development only. Never use them for a public or production deployment.** For a clean local instance without demo data, set `SEED_DEMO=0` and configure the initial account as described below.

To stop the app, press `Ctrl+C`. To stop the containers while preserving the database volume, run `docker compose down`. To delete local database data as well, use `docker compose down -v` (this is destructive).

## Manual local setup <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

### 1. Prepare PostgreSQL <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

Create a database and ensure the `pgvector` and `pg_trgm` extensions are available. The migrations use these extensions for vector similarity and candidate searching.

Set `DATABASE_URL` to the database connection string. For example:

```bash
export DATABASE_URL="postgresql://ats:your-password@localhost:5432/ats"
```

Use a database role with permission to apply migrations and create the required extensions.

### 2. Install dependencies and generate Prisma Client <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

```bash
npm install
```

`npm install` runs the Prisma generation step through `postinstall`.

### 3. Apply database migrations <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

```bash
npm run db:deploy
```

### 4. Start the server <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

For development with automatic restarts:

```bash
npm run dev
```

For a normal start:

```bash
npm start
```

The app listens on port `3000` by default. Set `PORT` to change it.

### Initial account <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

- In a fresh **local development** database, demo data is seeded by default unless `SEED_DEMO=0`.
- In **production**, leave demo seeding disabled. Set `ADMIN_EMAIL`, `ADMIN_NAME`, and `ADMIN_PASSWORD` (at least 10 characters) when using the legacy password login so the first admin can be created.
- If Clerk is enabled, every verified Clerk user can sign in and is a recruiter by default. Set `ADMIN_EMAIL` to the email that should receive the admin role, or grant the role through server-controlled Clerk public metadata. Do not expose admin-role controls to ordinary users.

## Configuration and environment variables <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

Set environment variables in your deployment platform (for Vercel, use **Project → Settings → Environment Variables**). Never commit real secrets to Git.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string. Use a database with `pgvector` and `pg_trgm` enabled. |
| `JWT_SECRET` | Yes in production | Unique signing secret, at least 16 characters. A random 32-byte secret is recommended. |
| `PORT` | No | HTTP port; defaults to `3000`. |
| `ADMIN_EMAIL` | For initial admin / admin override | Initial administrator for legacy login; with Clerk, can designate the admin email. |
| `ADMIN_PASSWORD` | Legacy login only | Initial admin password; minimum 10 characters. Do not set a demo password in production. |
| `ADMIN_NAME` | No | Name for the initial admin account. |
| `SEED_DEMO` | No | `1` seeds demo records; `0` disables demo seeding. Keep demo seeding off in production. |
| `CLERK_PUBLISHABLE_KEY` | Optional | Enables Clerk when used with the secret key. |
| `CLERK_SECRET_KEY` | Optional | Server-side Clerk key. Keep it secret. |
| `TRUST_PROXY` | Deployment-specific | Express proxy trust setting when behind a known proxy. Configure only for the actual proxy topology. |
| `RETENTION_DAYS` | No | Anonymise rejected candidates after the specified number of days. |
| `APPLY_LIMIT` | No | Public-application rate limit per IP in the 10-minute window; defaults to `5`. |
| `WS_HEARTBEAT_MS` | No | WebSocket heartbeat/session-revocation interval; defaults to `30000` ms. |
| `SHADOW_DATABASE_URL` | Dev/migrations only | Optional empty scratch database for `prisma migrate dev`. Never point it at a database with valuable data. |
| `ANTHROPIC_API_KEY` | Optional | Enables Anthropic-assisted role matching. |
| `ANTHROPIC_MODEL` | No | Overrides the Anthropic model name used by the role-matching code. |
| `OPENAI_API_KEY` | Optional | Enables OpenAI embeddings for similarity search. |
| `EMBEDDING_MODEL` | No | Overrides the default OpenAI embedding model (`text-embedding-3-small`). |
| `EMAIL_PROVIDER` | For selecting a provider | Selects the configured email provider; see [Email provider setup](#email-provider-setup). |
| `BREVO_API_KEY` | Brevo | Server-side Brevo API key. |
| `BREVO_FROM_EMAIL` | Brevo | Sender address configured in Brevo. |
| `BREVO_FROM_NAME` | No | Display name for the Brevo sender; defaults to `HirePath ATS`. |
| `GMAIL_USER` | Gmail SMTP | Gmail mailbox used for SMTP delivery. |
| `GMAIL_APP_PASSWORD` | Gmail SMTP | Google App Password for that mailbox, not its normal login password. |
| `PLUNK_SECRET_KEY` | Plunk | Plunk API secret. |
| `PLUNK_FROM` | Plunk | Sender address on a domain verified in Plunk. |
| `RESEND_API_KEY` | Resend | Resend API key. |
| `EMAIL_FROM` | Resend production | Sender formatted as `Name <sender@your-verified-domain.com>`. |

For deployments using Clerk, set **both** Clerk keys. For local password-based login, leave them unset.

## Email provider setup <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

HirePath calls its email provider from the **server**. Keep API keys, SMTP passwords, and provider credentials in server-side environment variables only.

### Brevo (shared HirePath sender) <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

Set:

```dotenv
EMAIL_PROVIDER=brevo
BREVO_API_KEY=your_brevo_api_key
BREVO_FROM_EMAIL=your_verified_sender@example.com
BREVO_FROM_NAME=HirePath ATS
```

1. Create an API key in the Brevo dashboard under **SMTP & API → API Keys & MCP**.
2. Add and verify the sender address in Brevo.
3. Add the four variables above to the deployment environment (for Vercel, select the Production environment), then redeploy.
4. Send a test message to an address you control before contacting candidates.

**Sender/domain limitation:** verifying a Yahoo/Gmail sender address does not authenticate that provider's domain. Brevo may reject the message, alter the visible sender domain, or require domain authentication depending on its current account and sending policies. A verified sender address is not a substitute for authenticating a domain you control. For a consistent branded sender such as `notifications@yourdomain.com`, configure a domain and complete Brevo's DNS authentication steps.

### Gmail SMTP <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

Set:

```dotenv
EMAIL_PROVIDER=gmail
GMAIL_USER=your_hiring_mailbox@gmail.com
GMAIL_APP_PASSWORD=your_google_app_password
```

Create a Google App Password for a dedicated hiring mailbox. Do not use the mailbox's normal password. Email will be sent through this mailbox; use a dedicated account if the system is shared by multiple recruiters. Gmail has sending limits and is not intended for bulk email.

### Plunk <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

Set:

```dotenv
EMAIL_PROVIDER=plunk
PLUNK_SECRET_KEY=your_plunk_secret_key
PLUNK_FROM=notifications@your-verified-domain.com
```

The sender domain must be verified in Plunk. Open-source/self-hosted software and the hosted email service have different hosting and account requirements.

### Resend <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

For production sending:

```dotenv
EMAIL_PROVIDER=resend-production
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=HirePath ATS <sender@your-verified-domain.com>
```

Production sending requires a sender domain verified in Resend.

When `RESEND_API_KEY` is configured and `EMAIL_PROVIDER` is **not** `resend-production`, the current code uses Resend's shared test sender (`onboarding@resend.dev`). Treat this as test-only: Resend's test sender is restricted and should not be used to email arbitrary candidate addresses in production.

### General email troubleshooting <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

- Confirm `EMAIL_PROVIDER` matches the provider you intend to use.
- Check that all required variables are present in the **Production** environment, with no leading/trailing spaces.
- After changing environment variables in Vercel, redeploy the application.
- Verify the sender with the provider and review any sender/domain warnings in its dashboard.
- Check the response/error in HirePath and the provider's activity/logs. A successful API response means the provider accepted the message; it does not guarantee inbox placement.
- Do not publish API keys or share them in screenshots, issues, or chat.

## Authentication and roles <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

### Authentication options <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

- **Clerk:** enabled when both `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are present. HirePath requires the primary Clerk email to be verified before exchanging the Clerk session for an internal HirePath API token.
- **Legacy login:** email/password login using scrypt password hashes when Clerk is not enabled.
- Internal API calls use a short-lived signed bearer token. The token expires after 12 hours.

### Roles <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

- **Admin:** can delete candidates and anonymise candidate records; can administer the initial admin setup.
- **Recruiter:** can manage hiring work and use the candidate email workflow, but cannot perform admin-only delete/anonymise actions.
- New Clerk users default to recruiter. An admin is assigned through the configured `ADMIN_EMAIL` override or server-controlled Clerk public metadata. Users must not be able to edit their own public metadata to grant themselves admin privileges.

All authenticated API endpoints require the HirePath bearer token unless explicitly identified as public or part of the Clerk/legacy login flow.

## Database and migrations <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

Prisma's schema is in `prisma/schema.prisma`; versioned SQL migrations are in `prisma/migrations/`.

Apply already-created migrations:

```bash
npm run db:deploy
```

Create a migration during development:

```bash
npm run db:migrate -- --name describe_your_change
```

`prisma migrate dev` may use `SHADOW_DATABASE_URL`. Point it only at an empty scratch database, because Prisma may reset the shadow database. Production deployments should apply reviewed migrations with `prisma migrate deploy`, not `prisma migrate dev`.

The application relies on PostgreSQL extensions including `pg_trgm` and `vector`. Confirm they are available on your provider before applying migrations. Some hosted Postgres providers require enabling pgvector in their dashboard. For features using `LISTEN/NOTIFY`, use a database connection mode that supports it; transaction-mode poolers do not support the listener semantics used by the realtime implementation.

## API reference <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

Except for login, Clerk session exchange, and public endpoints, requests require:

```http
Authorization: Bearer <hirepath-token>
```

### Health and authentication <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Liveness check |
| `GET` | `/api/auth/config` | Public | Frontend authentication configuration |
| `POST` | `/api/auth/login` | Public when Clerk is disabled | Legacy email/password login |
| `POST` | `/api/auth/clerk` | Clerk session required | Exchange verified Clerk identity for a HirePath token |
| `GET` | `/api/auth/me` | Authenticated | Current user |
| `POST` | `/api/auth/revoke-all` | Authenticated | Revoke existing sessions for the current account |

### Jobs and candidates <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET`, `POST` | `/api/jobs` | Authenticated | List or create jobs |
| `PUT` | `/api/jobs/:id` | Authenticated | Update job details or open/closed status |
| `GET` | `/api/candidates` | Authenticated | Search, filter, sort, and paginate candidates |
| `POST` | `/api/candidates` | Authenticated | Create candidate |
| `GET`, `PUT` | `/api/candidates/:id` | Authenticated | Read or update candidate |
| `DELETE` | `/api/candidates/:id` | Admin | Delete candidate and related history |
| `POST` | `/api/candidates/:id/anonymise` | Admin | Erase personal information and preserve stage history |
| `GET` | `/api/candidates/export` | Authenticated | Export filtered candidates as CSV |
| `POST` | `/api/candidates/:id/notes` | Authenticated | Add a timeline note |
| `POST` | `/api/candidates/:id/resume` | Authenticated | Upload PDF, TXT, or Markdown resume (max 5 MB) |
| `GET` | `/api/candidates/:id/resume` | Authenticated | Download stored resume |
| `POST` | `/api/candidates/:id/match` | Authenticated | Recalculate role match |
| `POST` | `/api/candidates/:id/scorecards` | Authenticated | Create or update caller's interview scorecard |
| `GET` | `/api/candidates/:id/email-draft?template=` | Authenticated | Render an email template |
| `POST` | `/api/candidates/:id/email` | Authenticated | Send and log an email through the selected provider |
| `PUT` | `/api/candidates/:id/interview` | Authenticated | Schedule or clear an interview |
| `POST` | `/api/candidates/:id/embedding` | Authenticated | Rebuild a candidate embedding |
| `GET` | `/api/candidates/semantic-search?q=...` | Authenticated | Find similar candidates |
| `GET` | `/api/calendar.ics` | Authenticated | Export scheduled interviews as iCalendar |
| `GET` | `/api/stats` | Authenticated | Dashboard analytics |

### Public careers page <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/careers` | Public | Public open-roles and application page |
| `GET` | `/api/public/jobs` | Public | List open roles with public fields |
| `POST` | `/api/public/apply` | Public | Submit an application with required consent |

### Realtime <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

| Protocol | Endpoint | Access | Description |
|---|---|---|---|
| WebSocket | `/ws` | Authenticated token handshake | Broadcast candidate changes in long-running Node deployments |

API request payloads are validated server-side; see `src/runtime.ts` for the Zod schemas and accepted fields.

## Testing and quality checks <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

### Type-check <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

```bash
npm run build
```

### Integration tests <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

Set `TEST_DATABASE_URL` to a **disposable** PostgreSQL database whose name ends in `_test`. The test suite resets its tables and refuses to run if the database name does not end in `_test`.

```bash
export TEST_DATABASE_URL="postgresql://ats:your-password@localhost:5432/ats_test"
npx prisma migrate deploy
npm test
```

Do not point `TEST_DATABASE_URL` at production or a database containing valuable data.

### Browser smoke tests <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

Start the app with a configured test database and migrations applied, install the Playwright browser, then run:

```bash
npx playwright install chromium
npm run test:e2e
```

Set `BASE_URL` if the app under test is not at `http://127.0.0.1:3000`.

### Continuous integration <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

The GitHub Actions workflow in `.github/workflows/ci.yml` runs the TypeScript build, migrations, integration tests, Playwright smoke tests, and Docker image build against a PostgreSQL service with pgvector. Check the Actions tab for the current result; this README does not imply that the latest workflow has passed.

## Deployment <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

### Vercel <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

The repository includes `vercel.json` and a `vercel-build` script.

1. Import the repository into Vercel and select the `main` branch.
2. Create a PostgreSQL database with the required extensions.
3. Add production environment variables, at minimum `DATABASE_URL` and a strong `JWT_SECRET`. Configure `ADMIN_EMAIL` and authentication settings for the chosen login method.
4. Apply the Prisma migrations to the target database using `npm run db:deploy` with the production `DATABASE_URL` configured in a secure environment.
5. Configure email and optional AI provider variables only if using those integrations.
6. Redeploy after changing environment variables.

**Serverless note:** long-lived background workers and persistent WebSocket connections may require a separate worker or a long-running Node host. Confirm these capabilities for your chosen deployment platform rather than assuming every process-level worker can run inside a serverless function.

### Docker / long-running Node host <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

The Docker image applies pending Prisma migrations on boot and then starts the Node server. For a production deployment, provide a managed PostgreSQL database, unique secrets, a real admin account, and the correct `TRUST_PROXY` value for the actual proxy chain. Do not enable demo data in production.

The application stores resumes in PostgreSQL, so no local persistent upload directory is required.

## Security and privacy <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

- Keep `.env`, API keys, OAuth secrets, database URLs, and SMTP passwords out of Git.
- Use a unique `JWT_SECRET` in production; do not reuse the example placeholder.
- Disable demo seeding in production and replace all sample credentials.
- Restrict administrative access and do not allow users to grant themselves admin roles.
- Use HTTPS in production.
- Verify candidate consent and applicable privacy/legal requirements before collecting resumes or other personal data.
- Use the anonymisation workflow when personal information should be removed; ordinary candidate deletion is destructive.
- Protect test databases separately from production data.

## Troubleshooting <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

| Problem | Checks |
|---|---|
| App fails at startup with `DATABASE_URL is required` | Add a valid PostgreSQL connection string to the environment. |
| Migration fails for `vector` or `pg_trgm` | Enable the required extension(s) on the PostgreSQL server and rerun reviewed migrations. |
| Production reports `JWT_SECRET` is too short | Set a unique secret of at least 16 characters; a random 32-byte secret is recommended. |
| Clerk login is unavailable | Confirm both `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are set, then redeploy. |
| Candidate email is not sent | Confirm `EMAIL_PROVIDER`, its required credentials, the verified sender, provider account status, and current provider logs. |
| Brevo rejects email or changes the sender | A verified Yahoo/Gmail address does not prove domain authentication. Review Brevo's sender and domain requirements; use a domain you control for a stable branded From address. |
| Resend only allows test recipients | `onboarding@resend.dev` is a test sender. Configure a verified production sender and use `EMAIL_PROVIDER=resend-production` for production mode. |
| Public application acknowledgement stays queued | Ensure the outbox worker is running; on serverless platforms, configure a separate scheduled/long-running worker if needed. |
| Playwright cannot reach the app | Start the app, apply migrations, and confirm `BASE_URL` points to the running server. |
| Realtime events are missing across instances | Check whether the hosting platform supports persistent WebSockets and whether the database connection supports PostgreSQL `LISTEN/NOTIFY`. |

## Contributing <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

Contributions are welcome.

1. Fork the repository and create a feature branch.
2. Keep changes focused and update tests or documentation where appropriate.
3. Run `npm run build`, the integration tests, and browser smoke tests when your local environment supports them.
4. Open a pull request describing the change and the checks you ran.

Do not include real secrets, personal candidate data, or production database dumps in issues or pull requests.

## License <img align="right" width="46" height="46" src="assets/robot-mascot.svg" alt="" />

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for the full text.
