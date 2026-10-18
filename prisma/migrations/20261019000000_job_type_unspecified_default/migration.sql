ALTER TABLE "jobs" ALTER COLUMN "job_type" SET DEFAULT '';

-- Jobs created before this field existed had no reliable type metadata.
-- Do not label legacy jobs as internships simply because of the first migration's transitional default.
UPDATE "jobs"
SET "job_type" = ''
WHERE "job_type" = 'Internship'
  AND "created_at" < TIMESTAMPTZ '2026-10-18 22:43:00+00';
