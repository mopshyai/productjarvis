create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  session_id text,
  event_name text not null,
  payload_json jsonb not null default '{}'::jsonb,
  path text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_event_created_idx
  on analytics_events (event_name, created_at desc);

create index if not exists analytics_events_workspace_created_idx
  on analytics_events (workspace_id, created_at desc);

create table if not exists workspace_feature_flags (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  landing_v2 boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table prompt_runs
  add column if not exists attempt_count integer not null default 1,
  add column if not exists provider_chain jsonb not null default '[]'::jsonb,
  add column if not exists failure_classification text,
  add column if not exists repair_attempted boolean not null default false;

alter table methodology_runs
  drop constraint if exists methodology_runs_prompt_run_id_fkey;

alter table methodology_runs
  add constraint methodology_runs_prompt_run_id_fkey
  foreign key (prompt_run_id) references prompt_runs(id) on delete set null;
