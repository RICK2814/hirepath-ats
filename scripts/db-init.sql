-- Runs once on first start of the compose Postgres volume.
-- Scratch DB for `npm run db:migrate` (Prisma shadow database), with pg_trgm pre-enabled.
CREATE DATABASE ats_shadow OWNER ats;
\connect ats_shadow
CREATE EXTENSION IF NOT EXISTS pg_trgm;
