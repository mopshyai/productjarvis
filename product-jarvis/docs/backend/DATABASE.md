# ProductJarvis Database

Schema, RLS, indexes, and partitioning for production and 1M+ scale.

---

## Schema overview

- **Auth and users:** `public.users` (mirror of `auth.users`), `workspace_members`, `user_profiles`, `user_sessions`, `auth_events`.
- **Workspace and onboarding:** `workspaces`, `onboarding_answers`, `workspace_method_preferences`, `workspace_feature_flags`.
- **Product and artifacts:** `product_context_snapshots`, `prds`, `prd_generations`, `tickets`, `decisions`, `decision_sources`, `document_chunks`, `digests`.
- **Integrations and usage:** `integrations`, `usage_counters`.
- **Prompt engine:** `prompt_runs`, `prompt_templates`, `context_assembly_logs`, `methodology_runs`, `methodology_registry_versions`.
- **Observability:** `audit_events`, `analytics_events`.

Migrations live in `supabase/migrations/` and run in filename order.

---

## Users and auth alignment

- **public.users:** One row per `auth.users.id` (FK to `auth.users(id) on delete cascade`). Synced via trigger `on_auth_user_created` and backfill. Used by `workspace_members.user_id`, `user_profiles.user_id`, `analytics_events.user_id`.
- **user_sessions:** One row per workspace; `payload` holds full session state. TTL via `expires_at`; optional cron to delete expired rows.

---

## Row Level Security (RLS)

RLS is enabled on all tenant-facing tables. Policies are workspace-scoped:

- **Pattern:** User can access rows where `workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())`. Implemented via helper `public.user_workspace_ids()`.
- **Service role:** Edge Functions use the Supabase admin client and bypass RLS. All functions must use `workspace_id` from validated JWT/session, not from client input alone.
- **prompt_templates / methodology_registry_versions:** Global read-only for `authenticated`.
- **public.users:** Users can read their own row (`id = auth.uid()`).
- **user_sessions:** RLS enabled with no policy for `authenticated`; only service role can read/write.

---

## Indexes (1M+ scale)

- **Hot paths:** `prds (workspace_id, created_at desc)`, `tickets (workspace_id, created_at desc)`, `digests (workspace_id, digest_date desc)`, `usage_counters (workspace_id, period_label)`.
- **Session and profile:** `user_sessions (expires_at)`, `user_profiles (user_id)` for “all workspaces for user.”
- **Existing:** `prompt_runs (workspace_id, created_at desc)`, `tickets (workspace_id, prd_id, provider, push_status, created_at desc)`, `decisions (workspace_id, decision_date desc)`, etc.

---

## Partitioning (optional)

For very high write volume, add time-based partitioning in a future migration:

- **audit_events,** **analytics_events,** **prompt_runs:** `PARTITION BY RANGE (created_at)` with monthly partitions. Requires new partitioned table + data migration; document in a follow-up migration.

---

## Connection pooling and read replicas

- Use **Supabase PgBouncer/Supavisor** for connection pooling.
- When available, use **read replicas** for read-heavy endpoints (digest, decisions search, session read).

---

## Profile and onboarding

- **user_profiles:** `(workspace_id, user_id)` unique; role, company_stage, team_size, persona.
- **onboarding_answers:** `(workspace_id, step_id)`; payload jsonb.
- **workspace_method_preferences:** One row per workspace; primary_method, supporting_methods, source.

Session hydration (in `authStore`) joins workspace, user_profiles, workspace_method_preferences, and usage_counters so the frontend receives a single session payload without N+1.
