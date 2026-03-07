-- ProductJarvis production: persistent session store (replaces in-memory Map in authStore).
-- One row per workspace; payload holds full SessionState. TTL cleanup via expires_at.

create table if not exists user_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id)
);

create index if not exists user_sessions_expires_at_idx
  on user_sessions (expires_at);

-- Only service role (Edge Functions) should access; no policy for authenticated.
alter table user_sessions enable row level security;

-- Optional: pg_cron or external job to delete expired sessions.
-- delete from user_sessions where expires_at < now();

comment on table user_sessions is 'Persistent session store; Edge Functions read/write via admin client.';
