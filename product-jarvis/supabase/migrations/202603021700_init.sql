-- ProductJarvis V1 baseline schema
create extension if not exists vector;

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'UTC',
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null,
  role text not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists product_context_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  context jsonb not null,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists prds (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  feature_request text not null,
  body jsonb not null,
  status text not null default 'draft',
  version integer not null default 1,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists prd_generations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  prd_id uuid references prds(id) on delete set null,
  model_name text not null,
  latency_ms integer not null,
  request_payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  prd_id uuid not null references prds(id) on delete cascade,
  provider text not null,
  draft jsonb not null,
  external_id text,
  push_status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  statement text not null,
  rationale text not null,
  decision_date date,
  author text,
  created_at timestamptz not null default now()
);

create table if not exists decision_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  decision_id uuid not null references decisions(id) on delete cascade,
  source_type text not null,
  source_id text not null,
  source_url text,
  excerpt text,
  confidence double precision not null default 0
);

create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  source_type text not null,
  source_id text not null,
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create table if not exists digests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  digest_date date not null,
  payload jsonb not null,
  confidence double precision not null,
  delivery_status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique(workspace_id, digest_date)
);

create table if not exists integrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  provider text not null,
  status text not null default 'disconnected',
  encrypted_tokens text,
  refresh_at timestamptz,
  created_at timestamptz not null default now(),
  unique(workspace_id, provider)
);

create table if not exists usage_counters (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  period_label text not null,
  prd_limit integer not null default 3,
  prd_generated integer not null default 0,
  created_at timestamptz not null default now(),
  unique(workspace_id, period_label)
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  actor_user_id uuid,
  event_type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
