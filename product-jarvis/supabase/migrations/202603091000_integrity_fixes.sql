-- Fix data integrity issues, missing FKs, indexes, triggers, and type mismatches.

----------------------------------------------------------------------
-- 1. Fix ingestion_jobs.workspace_id: TEXT → UUID with FK
----------------------------------------------------------------------
ALTER TABLE ingestion_jobs
  ALTER COLUMN workspace_id TYPE uuid USING workspace_id::uuid;

ALTER TABLE ingestion_jobs
  ADD CONSTRAINT ingestion_jobs_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

----------------------------------------------------------------------
-- 2. Fix match_document_chunks() to use UUID parameter (document_chunks.workspace_id is already UUID from init migration)
----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(1536),
  workspace_id_filter UUID,
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

----------------------------------------------------------------------
-- 3. Add missing FK constraints on nullable user references
----------------------------------------------------------------------
ALTER TABLE onboarding_answers
  ADD CONSTRAINT onboarding_answers_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE product_context_snapshots
  ADD CONSTRAINT product_context_snapshots_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE prds
  ADD CONSTRAINT prds_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE audit_events
  ADD CONSTRAINT audit_events_actor_user_id_fkey
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL;

----------------------------------------------------------------------
-- 3b. Fix document_chunks.source_id: make nullable with default
--     (init migration set NOT NULL, but evidence-ingest doesn't provide it)
----------------------------------------------------------------------
ALTER TABLE document_chunks ALTER COLUMN source_id DROP NOT NULL;
ALTER TABLE document_chunks ALTER COLUMN source_id SET DEFAULT '';

----------------------------------------------------------------------
-- 4. Add missing indexes
----------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS prd_generations_workspace_created_idx
  ON prd_generations (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS prd_generations_prd_id_idx
  ON prd_generations (prd_id) WHERE prd_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS document_chunks_source_id_idx
  ON document_chunks (source_id) WHERE source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS integrations_workspace_provider_idx
  ON integrations (workspace_id, provider);

----------------------------------------------------------------------
-- 5. Add updated_at auto-update trigger
----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_prds
    BEFORE UPDATE ON prds FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_user_profiles
    BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_workspace_method_preferences
    BEFORE UPDATE ON workspace_method_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_workspace_feature_flags
    BEFORE UPDATE ON workspace_feature_flags FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_user_sessions
    BEFORE UPDATE ON user_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

----------------------------------------------------------------------
-- 6. Add increment_prd_usage RPC (used by rateLimit.ts but missing)
----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_prd_usage(
  p_workspace_id UUID,
  p_period_label TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE usage_counters
    SET prd_generated = prd_generated + 1
  WHERE workspace_id = p_workspace_id
    AND period_label = p_period_label;

  IF NOT FOUND THEN
    INSERT INTO usage_counters (workspace_id, period_label, prd_limit, prd_generated)
    VALUES (p_workspace_id, p_period_label, 3, 1)
    ON CONFLICT (workspace_id, period_label)
    DO UPDATE SET prd_generated = usage_counters.prd_generated + 1;
  END IF;
END;
$$;

----------------------------------------------------------------------
-- 7. Rate limit table for DB-backed rate limiting
----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rate_limit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_end TIMESTAMPTZ NOT NULL,
  UNIQUE (workspace_id, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS rate_limit_entries_lookup_idx
  ON rate_limit_entries (workspace_id, endpoint, window_end DESC);

ALTER TABLE rate_limit_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to rate_limit_entries"
  ON rate_limit_entries FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_workspace_id UUID,
  p_endpoint TEXT,
  p_max_requests INTEGER,
  p_window_ms INTEGER
)
RETURNS TABLE (allowed BOOLEAN, remaining INTEGER, retry_after_ms INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_window_end TIMESTAMPTZ;
  v_current_count INTEGER;
BEGIN
  v_window_start = date_trunc('hour', NOW());
  v_window_end = v_window_start + (p_window_ms || ' milliseconds')::INTERVAL;

  INSERT INTO rate_limit_entries (workspace_id, endpoint, request_count, window_start, window_end)
  VALUES (p_workspace_id, p_endpoint, 1, v_window_start, v_window_end)
  ON CONFLICT (workspace_id, endpoint, window_start)
  DO UPDATE SET request_count = rate_limit_entries.request_count + 1
  RETURNING rate_limit_entries.request_count INTO v_current_count;

  IF v_current_count > p_max_requests THEN
    RETURN QUERY SELECT
      false::BOOLEAN,
      0::INTEGER,
      (EXTRACT(EPOCH FROM (v_window_end - NOW())) * 1000)::INTEGER;
  ELSE
    RETURN QUERY SELECT
      true::BOOLEAN,
      (p_max_requests - v_current_count)::INTEGER,
      0::INTEGER;
  END IF;
END;
$$;

----------------------------------------------------------------------
-- 8. Cleanup: remove expired rate limit entries (run periodically)
----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM rate_limit_entries WHERE window_end < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
