create table if not exists methodology_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  prompt_run_id uuid references prompt_runs(id) on delete set null,
  primary_method text not null,
  supporting_methods jsonb not null default '[]'::jsonb,
  selection_reason text not null,
  score_payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists methodology_runs_workspace_created_idx
  on methodology_runs (workspace_id, created_at desc);

create table if not exists methodology_registry_versions (
  version text primary key,
  published_at timestamptz not null default now(),
  change_summary text not null,
  active boolean not null default false
);

insert into methodology_registry_versions (version, change_summary, active)
values ('v1', 'Top-30 methodology registry initial release', true)
on conflict (version) do update set active = excluded.active;
