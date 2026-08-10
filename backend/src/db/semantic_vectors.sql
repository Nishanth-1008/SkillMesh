-- pgvector semantic search (Phase 2). Applied as a SEPARATE guarded migration
-- step in db.js: if the `vector` extension isn't available (some managed
-- Postgres), this block is skipped and the app falls back to in-memory cosine.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS semantic_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  text TEXT NOT NULL,
  vector vector(384),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_semantic_vectors_entity ON semantic_vectors(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_semantic_vectors_hnsw ON semantic_vectors USING hnsw (vector vector_cosine_ops);
