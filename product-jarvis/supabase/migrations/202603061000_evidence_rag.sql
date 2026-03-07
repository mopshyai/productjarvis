-- Phase 1: Evidence Ingestion + RAG
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Ingestion jobs table (tracks upload/processing state)
CREATE TABLE IF NOT EXISTS ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('user_interview', 'survey', 'support_ticket', 'analytics', 'competitor', 'document')),
  source_url TEXT,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('pending', 'processing', 'complete', 'failed')),
  chunk_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_workspace ON ingestion_jobs (workspace_id, created_at DESC);

-- Document chunks table with vector embedding column
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_url TEXT,
  job_id UUID REFERENCES ingestion_jobs(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  embedding vector(1536),  -- text-embedding-3-small dimension
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safely add columns that may be missing if document_chunks already existed
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'document';
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- HNSW index for fast approximate nearest-neighbor search
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
  ON document_chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_document_chunks_workspace ON document_chunks (workspace_id, created_at DESC);

-- RLS policies
ALTER TABLE ingestion_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- Service role bypass (Edge Functions use service role)
CREATE POLICY "Service role full access to ingestion_jobs"
  ON ingestion_jobs FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to document_chunks"
  ON document_chunks FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Match function for vector similarity search used by opportunities-synthesize
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(1536),
  workspace_id_filter TEXT,
  match_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  source_type TEXT,
  source_url TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    dc.id,
    dc.content,
    dc.source_type,
    dc.source_url,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  WHERE dc.workspace_id = workspace_id_filter
    AND dc.embedding IS NOT NULL
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;
