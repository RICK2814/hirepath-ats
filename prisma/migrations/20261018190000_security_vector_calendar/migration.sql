ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS embedding vector(384);
CREATE INDEX IF NOT EXISTS candidates_embedding_cosine_idx
  ON candidates USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

