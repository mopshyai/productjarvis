# ProductJarvis Live Cutover Runbook (Phase 3)

## Scope
- All-at-once cutover from mixed/mock behavior to live Supabase-backed runtime.
- Applies to critical flows: auth, onboarding, PRD generation/update, ticket preview/push, decision search, digest.

## Preconditions (T-24h)
1. Environment variables are configured:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY`
   - optional `OPENAI_API_KEY`
2. Deploy migrations in order:
   - `202603021700_init.sql`
   - `202603021930_prompt_engine.sql`
   - `202603022130_methodology_engine.sql`
   - `202603022245_auth_onboarding_ux.sql`
   - `202603022246_users_and_fk.sql`
   - `202603031000_backend_hardening.sql`
   - `202603031230_phase3_cutover.sql`
   - `202603031001_rls_policies.sql`
   - `202603031002_indexes_partitioning.sql`
   - `202603031003_user_sessions.sql`
3. Deploy edge functions including:
   - `prd-update`
   - `cutover-health`
   - `events`
   - updated `prd-generate`, `prd-tickets-preview`, `prd-tickets-push`, `decisions-search`
4. Validate live frontend config:
   - `VITE_USE_LIVE_API=true`
   - `VITE_API_BASE_URL` points at deployed API gateway.

## Cutover Steps (T-0)
1. Deploy backend functions + migrations as one release.
2. Deploy frontend with live API env toggles.
3. Verify `GET /api/session` returns `feature_flags` and session is loaded from `user_sessions` (persistent session store).
4. Verify `GET /api/cutover-health` returns `gate_checks`.

## T+5m Smoke Validation
Run:
- `./scripts/cutover_smoke.sh`

Pass criteria:
1. Auth callback endpoint responds 2xx.
2. PRD generate responds with `id`, `body`, `version`.
3. PRD update enforces approval token and version locking.
4. Ticket preview returns tickets.
5. Ticket push returns deterministic `failed[]` shape.
6. Decision search returns either results or explicit not-found.
7. Digest endpoint returns response with confidence/citations.

## T+30m Operational Checks
1. `GET /api/cutover-health`:
   - `fallback_rate_below_15pct = true`
   - `p95_latency_below_30s = true`
   - `auth_callback_failures_last_hour_below_5 = true`
   - `ticket_push_failure_rate_below_10pct = true`
2. `GET /api/prompt-runs` metrics:
   - schema validation failure rate < 2%.
3. Integration status endpoint:
   - no unexpected disconnect spikes.

## Metrics and alerts (production)

Extend `GET /api/cutover-health` or add `/api/metrics` to expose: rate limit usage (if implemented), queue depth (if async LLM), prompt_runs latency percentiles (p95 < 30s), auth/session error counts. Define alert thresholds (e.g. p95 latency > 30s, auth failure rate > 5%, queue depth > N) and wire to PagerDuty or Slack. See [docs/backend/PRODUCTION_ARCHITECTURE.md](backend/PRODUCTION_ARCHITECTURE.md) for observability details.

## Rollback Triggers
Rollback immediately if any blocker occurs:
1. Auth flow unavailable.
2. PRD update fails for valid requests.
3. Ticket push endpoint systemic failure.
4. Decision search returns only errors.

## Rollback Sequence
1. Revert frontend env to disable live mode (`VITE_USE_LIVE_API=false`).
2. Redeploy previous stable frontend artifact.
3. Keep backend deployed for diagnostics; do not run destructive DB changes.
4. Capture failure details from:
   - `/api/cutover-health`
   - `/api/prompt-runs`
   - function logs
5. Open incident summary with timestamp, affected endpoints, and error rates.
