create extension if not exists pg_trgm;

-- Keep analytics_events.user_id FK to public.users (created in 202603022246).

create index if not exists tickets_workspace_prd_provider_status_idx
  on tickets (workspace_id, prd_id, provider, push_status, created_at desc);

create index if not exists decisions_workspace_date_idx
  on decisions (workspace_id, decision_date desc);

create index if not exists decision_sources_decision_idx
  on decision_sources (decision_id);

create index if not exists decision_sources_excerpt_trgm_idx
  on decision_sources using gin (excerpt gin_trgm_ops);
