-- Stop here with a clear message (instead of deleting data) if duplicate applications already exist.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "candidates" WHERE "job_id" IS NOT NULL GROUP BY "job_id", "email" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Duplicate (job_id, email) candidates exist. Find them with: SELECT job_id, email, count(*) FROM candidates GROUP BY 1,2 HAVING count(*) > 1. Merge or delete them, then re-run migrate deploy.';
  END IF;
END $$;

-- CreateTable
CREATE TABLE "rate_limits" (
    "key" TEXT NOT NULL,
    "n" INTEGER NOT NULL,
    "reset_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "candidates_job_id_email_key" ON "candidates"("job_id", "email");
