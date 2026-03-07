-- ProductJarvis production: indexes for 1M+ scale and optional partitioning.
-- Connection pooling: use Supabase PgBouncer/Supavisor. Read replicas for digest, decisions search, session read.

-- Composite indexes for hot paths (add only if not already present)
create index if not exists prds_workspace_created_idx
  on prds (workspace_id, created_at desc);

create index if not exists tickets_workspace_created_idx
  on tickets (workspace_id, created_at desc);

create index if not exists digests_workspace_date_idx
  on digests (workspace_id, digest_date desc);

create index if not exists usage_counters_workspace_period_idx
  on usage_counters (workspace_id, period_label);

-- user_profiles: lookup all workspaces for a user at scale
create index if not exists user_profiles_user_id_idx
  on user_profiles (user_id) where user_id is not null;

-- Optional: time-based partitioning for very high write volume.
-- Uncomment and run when audit_events / analytics_events / prompt_runs exceed target row counts.
-- Example for audit_events (requires new partitioned table + data migration):
--
-- create table audit_events_partitioned (
--   like audit_events including defaults
-- ) partition by range (created_at);
-- create table audit_events_y2026m03 partition of audit_events_partitioned
--   for values from ('2026-03-01') to ('2026-04-01');
-- -- migrate data, rename, add constraints...
--
-- For now we rely on B-tree indexes; add partitioning in a future migration when needed.

comment on index prds_workspace_created_idx is 'Hot path: list PRDs by workspace';
comment on index user_profiles_user_id_idx is 'Lookup all workspaces for user at scale';
