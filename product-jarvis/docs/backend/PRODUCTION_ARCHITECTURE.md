# ProductJarvis Production Architecture

Backend entrypoint, auth, rate limits, and scaling for 1M+ users.

---

## 1. API entrypoint and routing

The frontend calls `VITE_API_BASE_URL` + path (e.g. `https://api.example.com/api/session`). Production needs a single entrypoint that:

1. Verifies JWT and attaches `user_id` / `workspace_id` to context.
2. Routes `/api/*` to the appropriate Supabase Edge Function (or serverless).

### URL layout (Supabase Edge Functions)

| Frontend path | Method | Edge Function | Notes |
|---------------|--------|----------------|-------|
| `/api/session` | GET | `session` | Query: `workspace_id` or header `x-workspace-id` |
| `/api/auth/magic-link` | POST | `auth-magic-link` | |
| `/api/auth/callback` | GET | `auth-callback` | Query: `provider`, `workspace_id`, `token` |
| `/api/logout` | POST | `logout` | |
| `/api/command/execute` | POST | `command-execute` | |
| `/api/prd/generate` | POST | `prd-generate` | |
| `/api/prd/update` | POST | `prd-update` | |
| `/api/prd/:id/tickets/preview` | POST | `prd-tickets-preview` | |
| `/api/prd/:id/tickets/push` | POST | `prd-tickets-push` | |
| `/api/decisions/search` | POST | `decisions-search` | |
| `/api/decisions/detect` | POST | `decisions-detect` | |
| `/api/digest/today` | GET | `digest-today` | |
| `/api/integrations/status` | GET | `integrations-status` | |
| `/api/integrations/auth/start` | GET | `integrations-auth-start` | |
| `/api/integrations/auth/callback` | GET | `integrations-auth-callback` | |
| `/api/events` | POST | `events` | Analytics |
| `/api/onboarding/*` | GET/POST | `onboarding-schema`, `onboarding-answers`, `onboarding-complete` | |
| `/api/methodologies` | GET | `methodologies` | |
| `/api/cutover-health` | GET | `cutover-health` | |

### Options for the API host

- **Supabase project URL directly:** Frontend calls `https://<project_ref>.supabase.co/functions/v1/<function_name>` with `Authorization: Bearer <anon_or_service_key>` and optional `x-workspace-id`. No extra gateway.
- **BFF (Vercel/Netlify serverless):** A thin proxy that validates JWT, sets `x-workspace-id` from claim or DB, and forwards to Supabase Edge Functions. CORS and rate limiting live in the BFF.
- **API Gateway (Kong, AWS API Gateway):** Route `/api/*` to Supabase or to a Lambda that forwards. JWT validation and rate limits in the gateway.

### CORS

Allow the frontend origin(s); required headers: `Authorization`, `Content-Type`, `x-workspace-id`.

---

## 2. Auth and JWT

- Use **Supabase Auth** (or Auth0/Clerk) for sign-up/sign-in. Frontend stores session and sends JWT on each request (`Authorization: Bearer <access_token>` or cookie).
- **Edge Function middleware (or BFF):** Verify JWT, resolve `user_id` from the token and `workspace_id` from claim or from `workspace_members` (e.g. first workspace for user). Reject 401 for protected routes when token is missing or invalid.
- Session state is persisted in `user_sessions` (see [DATABASE.md](DATABASE.md)); Edge Functions use the service role and read/write by `workspace_id`.

---

## 3. Rate limiting and quotas

### Per-workspace (and optionally per-user) rate limits

- **Goal:** Protect LLM and DB from abuse (e.g. N requests/minute for command, PRD, ticket, digest).
- **Where:** In the API gateway, or in a shared Edge Function middleware that runs before the handler. Use Redis or DB-backed counters (sliding or fixed window).
- **Suggested limits (tune in production):**
  - Command execute: 60/min per workspace
  - PRD generate: 20/min per workspace
  - Ticket preview/push: 30/min per workspace
  - Digest: 10/min per workspace
  - Session: 120/min per workspace

### Quota enforcement (usage_counters)

- Enforce `usage_counters.prd_limit` and `prd_generated` in PRD-generate and ticket-push flows. Return **429** (or a clear error payload) when over quota.
- Reset or increment by `period_label` (e.g. monthly); logic already exists in schema.

---

## 4. LLM and long-running work

- **Edge Functions** have execution time limits (~150s on Supabase). For PRD generation and ticket factory:
  - **Option A (sync):** Keep synchronous with strict timeout and retry with backoff; surface “still processing” in UI if needed.
  - **Option B (recommended at scale):** Offload to a job queue. Client calls `POST /api/prd/generate` which enqueues a job (e.g. Supabase pg_net calling a worker URL, or Inngest/Trigger.dev/SQS) and returns `job_id`; client polls `GET /api/jobs/:id` or uses webhook/SSE for result. Workers call the same prompt engine and write the result to the DB.
- Store all prompt runs and costs in `prompt_runs` (and any cost table) for observability and billing.

---

## 5. Profile and session hydration

- Session is loaded in `getSessionState(workspaceId)` from `user_sessions` and hydrated with:
  - `hydrateWorkspaceAndProfile`: workspace (name, onboarding_complete, timezone), user_profiles, workspace_method_preferences, usage_counters.
  - `hydrateFeatureFlags`: workspace_feature_flags.
  - Integrations: filled in the session endpoint from `integrations` table.
- One session payload per request; no N+1. See [DATABASE.md](DATABASE.md) for schema.

---

## 6. Caching (optional at scale)

- **Session:** Stored in DB (`user_sessions`); optional short TTL in Redis if read volume is very high.
- **Read-heavy, rarely changing:** Methodology registry, prompt template versions, workspace feature flags. Cache in Edge Function memory (short TTL) or Redis per workspace.
- **Product context:** Consider caching latest `product_context_snapshots` or assembled context in Redis with invalidation on update.

---

## 7. Observability

- **Logging:** Structured logs from Edge Functions (request_id, workspace_id, user_id, latency, error_code). Ship to Supabase Logs or external (Datadog, Axiom).
- **Metrics:** Extend `/api/cutover-health` to expose rate limit usage, queue depth (if async), prompt_runs latency percentiles, auth/session errors. See [CUTOVER_RUNBOOK.md](../CUTOVER_RUNBOOK.md).
- **Alerts:** Define thresholds (e.g. p95 latency > 30s, auth failure rate > 5%, queue depth > N) and wire to PagerDuty/Slack in the runbook.
