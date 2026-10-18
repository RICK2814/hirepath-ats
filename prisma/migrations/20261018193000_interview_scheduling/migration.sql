ALTER TABLE candidates ADD COLUMN IF NOT EXISTS interview_at TIMESTAMPTZ(3);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS interview_duration_minutes INTEGER NOT NULL DEFAULT 45;
CREATE INDEX IF NOT EXISTS candidates_interview_at_idx ON candidates (interview_at) WHERE interview_at IS NOT NULL;
