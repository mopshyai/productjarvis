-- ProductJarvis production: Row Level Security for all tenant-facing tables.
-- Service role (Edge Functions) bypasses RLS; client access uses auth.uid() and workspace membership.

-- Helper: true if the current user is a member of the row's workspace.
create or replace function public.user_workspace_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select workspace_id from workspace_members where user_id = auth.uid();
$$;

-- workspaces: user can see workspaces they belong to
alter table workspaces enable row level security;
create policy workspaces_select on workspaces for select
  using (id in (select public.user_workspace_ids()));

-- workspace_members: user can see members of their workspaces
alter table workspace_members enable row level security;
create policy workspace_members_select on workspace_members for select
  using (workspace_id in (select public.user_workspace_ids()));

-- user_profiles
alter table user_profiles enable row level security;
create policy user_profiles_select on user_profiles for select
  using (workspace_id in (select public.user_workspace_ids()));
create policy user_profiles_all on user_profiles for all
  using (workspace_id in (select public.user_workspace_ids()));

-- onboarding_answers
alter table onboarding_answers enable row level security;
create policy onboarding_answers_select on onboarding_answers for select
  using (workspace_id in (select public.user_workspace_ids()));
create policy onboarding_answers_all on onboarding_answers for all
  using (workspace_id in (select public.user_workspace_ids()));

-- workspace_method_preferences
alter table workspace_method_preferences enable row level security;
create policy workspace_method_preferences_select on workspace_method_preferences for select
  using (workspace_id in (select public.user_workspace_ids()));
create policy workspace_method_preferences_all on workspace_method_preferences for all
  using (workspace_id in (select public.user_workspace_ids()));

-- product_context_snapshots
alter table product_context_snapshots enable row level security;
create policy product_context_snapshots_all on product_context_snapshots for all
  using (workspace_id in (select public.user_workspace_ids()));

-- prds
alter table prds enable row level security;
create policy prds_all on prds for all
  using (workspace_id in (select public.user_workspace_ids()));

-- prd_generations
alter table prd_generations enable row level security;
create policy prd_generations_all on prd_generations for all
  using (workspace_id in (select public.user_workspace_ids()));

-- tickets
alter table tickets enable row level security;
create policy tickets_all on tickets for all
  using (workspace_id in (select public.user_workspace_ids()));

-- decisions
alter table decisions enable row level security;
create policy decisions_all on decisions for all
  using (workspace_id in (select public.user_workspace_ids()));

-- decision_sources
alter table decision_sources enable row level security;
create policy decision_sources_all on decision_sources for all
  using (workspace_id in (select public.user_workspace_ids()));

-- document_chunks
alter table document_chunks enable row level security;
create policy document_chunks_all on document_chunks for all
  using (workspace_id in (select public.user_workspace_ids()));

-- digests
alter table digests enable row level security;
create policy digests_all on digests for all
  using (workspace_id in (select public.user_workspace_ids()));

-- integrations
alter table integrations enable row level security;
create policy integrations_all on integrations for all
  using (workspace_id in (select public.user_workspace_ids()));

-- usage_counters
alter table usage_counters enable row level security;
create policy usage_counters_all on usage_counters for all
  using (workspace_id in (select public.user_workspace_ids()));

-- audit_events
alter table audit_events enable row level security;
create policy audit_events_select on audit_events for select
  using (workspace_id in (select public.user_workspace_ids()));

-- prompt_runs
alter table prompt_runs enable row level security;
create policy prompt_runs_all on prompt_runs for all
  using (workspace_id in (select public.user_workspace_ids()));

-- methodology_runs
alter table methodology_runs enable row level security;
create policy methodology_runs_all on methodology_runs for all
  using (workspace_id in (select public.user_workspace_ids()));

-- analytics_events
alter table analytics_events enable row level security;
create policy analytics_events_select on analytics_events for select
  using (workspace_id in (select public.user_workspace_ids()));
create policy analytics_events_insert on analytics_events for insert
  with check (workspace_id in (select public.user_workspace_ids()));

-- workspace_feature_flags
alter table workspace_feature_flags enable row level security;
create policy workspace_feature_flags_select on workspace_feature_flags for select
  using (workspace_id in (select public.user_workspace_ids()));

-- auth_events
alter table auth_events enable row level security;
create policy auth_events_select on auth_events for select
  using (workspace_id in (select public.user_workspace_ids()));

-- context_assembly_logs
alter table context_assembly_logs enable row level security;
create policy context_assembly_logs_all on context_assembly_logs for all
  using (workspace_id in (select public.user_workspace_ids()));

-- prompt_templates: global read-only for authenticated
alter table prompt_templates enable row level security;
create policy prompt_templates_select on prompt_templates for select
  to authenticated using (true);

-- methodology_registry_versions: global read
alter table methodology_registry_versions enable row level security;
create policy methodology_registry_versions_select on methodology_registry_versions for select
  to authenticated using (true);

-- public.users: users can read own row
alter table public.users enable row level security;
create policy users_select_own on public.users for select
  using (id = auth.uid());
