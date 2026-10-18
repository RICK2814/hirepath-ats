# HirePath ATS v12 — release notes

## Implemented in this package

- The API's primary source is `ats/server.ts`; `ats/server.js` remains a compatibility bridge. Node.js 22.18+ is required for native TypeScript type stripping.
- Zod schemas validate and normalize candidate, public application, job, interview schedule, note, scorecard, email and semantic-search inputs. Positive job IDs submitted as strings by HTML forms are normalized to numbers.
- Playwright smoke tests cover public careers, authentication boundaries, recruiter semantic search and session revocation.
- pgvector candidate search includes OpenAI embeddings when configured and a deterministic local feature-hashing fallback. The Candidates screen now has a “Find similar” action. The fallback is lexical similarity, not a learned model.
- Interview dates and durations are stored in PostgreSQL and exported as an authenticated iCalendar feed.
- Per-user token versions back `/api/auth/revoke-all`; HTTP tokens fail after revocation, and active WebSockets are closed on the next heartbeat. The UI exposes the action.
- Candidate anonymisation clears derived embeddings and guards against a background refresh restoring them. Resume updates trigger embedding refreshes.
- CI provisions PostgreSQL with pgvector, installs dependencies, type-checks, migrates, runs integration/browser tests, and builds the Docker image.

## Verification status

Source syntax checks passed for the server, runtime schemas, inline browser scripts and Playwright files; JSON configuration checks passed. The full install/build/database/browser pipeline was **not** verified in the authoring environment: `npm install` failed because the environment could not resolve `registry.npmjs.org` (`EAI_AGAIN`), and Docker/PostgreSQL binaries were unavailable. The existing incoming lockfile is missing some new development-tool entries; use `npm install` (not `npm ci`) to reconcile it on a network-enabled machine. Do not treat this package as production-verified until the CI workflow passes end to end.
