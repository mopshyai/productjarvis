create table if not exists prompt_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  prompt_id text not null,
  prompt_version text not null,
  provider_used text not null,
  fallback_used boolean not null default false,
  fallback_reason text,
  latency_ms integer not null,
  input_json jsonb not null,
  output_json jsonb not null,
  validation_status text not null,
  error_code text,
  created_at timestamptz not null default now()
);

create index if not exists prompt_runs_workspace_created_idx
  on prompt_runs (workspace_id, created_at desc);

create index if not exists prompt_runs_id_version_idx
  on prompt_runs (prompt_id, prompt_version);

create table if not exists prompt_templates (
  prompt_id text primary key,
  active_version text not null,
  notes text,
  updated_at timestamptz not null default now()
);

create table if not exists context_assembly_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  request_type text not null,
  token_count integer not null,
  missing_context jsonb not null,
  truncation_applied boolean not null,
  created_at timestamptz not null default now()
);
