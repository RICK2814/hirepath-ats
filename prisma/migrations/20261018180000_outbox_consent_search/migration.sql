-- Consent + anonymisation markers
ALTER TABLE "candidates" ADD COLUMN "consent_at" TIMESTAMPTZ(3),
ADD COLUMN "anonymised_at" TIMESTAMPTZ(3);

-- Email outbox: status 'queued' rows are sent (and retried with backoff) by a background worker
ALTER TABLE "emails" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "next_at" TIMESTAMPTZ(3),
ADD COLUMN "last_error" TEXT;
CREATE INDEX "emails_status_next_at_idx" ON "emails"("status", "next_at");

-- Fast substring search (name, email, skills). Hand-written: Prisma cannot model expression indexes.
-- If your host forbids extensions, ask for pg_trgm to be enabled (supported on Render, Railway, Neon, Supabase, RDS).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "candidates_search_trgm_idx" ON "candidates" USING gin (lower("name" || ' ' || "email" || ' ' || "skills") gin_trgm_ops);
