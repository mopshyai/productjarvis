create table if not exists user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  role text,
  company_stage text,
  team_size text,
  persona text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists onboarding_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  step_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists onboarding_answers_workspace_step_idx
  on onboarding_answers (workspace_id, step_id);

create table if not exists workspace_method_preferences (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  primary_method text not null,
  supporting_methods jsonb not null default '[]'::jsonb,
  source text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id)
);

create table if not exists auth_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  event_type text not null,
  status text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists auth_events_workspace_created_idx
  on auth_events (workspace_id, created_at desc);
