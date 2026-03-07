# ProductJarvis

ProductJarvis is an AI product operating system prototype with a working V1 scaffold:

- Command Bar (`/command`) for natural-language intent routing
- PRD Generator (`/prds`) with strict JSON structure, inline editing, and explicit approval save flow
- Ticket Factory preview/push flow for Jira and Linear with confirmation gates
- Decision Memory (`/decisions`) with source citations and explicit no-result fallback
- Daily Digest (`/digest`) with confidence labeling and manual-context fallback

## Tech Stack

- Frontend: React + Vite
- State/API: local mock backend layer in `src/lib/mockBackend.js` (contract-compatible with planned APIs)
- Backend scaffold: Supabase schema migration + Edge Function stubs in `supabase/`

## Local Run

```bash
npm install
npm run dev
```

## Prompt Engine V1 (Implemented)

- Versioned prompt assets in `supabase/functions/_shared/prompts/`:
  - `templates/*.md`
  - `schemas/*.json`
- Shared execution engine:
  - context assembly (`_shared/context/assembler.ts`)
  - provider routing with Claude primary + fallback (`_shared/llm/router.ts`)
  - strict JSON/schema/citation enforcement (`_shared/validation/*`)
  - run logging (`_shared/storage.ts`)
- Pipelines for all 7 core prompts:
  - `prd_generation`, `ticket_factory`, `decision_detection`, `daily_digest`, `command_router`, `prd_health`, `stakeholder_update`

## API Contracts Implemented (Frontend-facing)

- `POST /api/command/execute`
- `POST /api/prd/generate`
- `POST /api/prd/update`
- `POST /api/prd/:id/tickets/preview`
- `POST /api/prd/:id/tickets/push`
- `POST /api/decisions/search`
- `POST /api/decisions/detect`
- `GET /api/digest/today`
- `POST /api/prd/health-score`
- `POST /api/stakeholder/update`
- `POST /api/auth/magic-link`
- `GET /api/auth/callback`
- `GET /api/session`
- `POST /api/logout`
- `POST /api/events`
- `GET /api/onboarding/schema`
- `POST /api/onboarding/answers`
- `POST /api/onboarding/complete`
- `POST /api/methodologies/recommend`
- `GET /api/integrations/status`
- `GET /api/integrations/auth/start`
- `GET /api/integrations/auth/callback`
- `POST /api/integrations/refresh`
- `GET /api/prompt-runs`
- `GET /api/cutover-health`
- `GET /api/methodologies`
- `POST /api/methodologies/validate`
- `GET /api/methodology-governance-report`
- `POST /api/methodology-registry-version`
- Integration endpoints (connect/refresh/status) are modeled in the mock backend.

## Supabase Scaffold

- Migration: `supabase/migrations/202603021700_init.sql`
- Migrations (run in order):
  - `202603021700_init.sql`, `202603021930_prompt_engine.sql`, `202603022130_methodology_engine.sql`, `202603022245_auth_onboarding_ux.sql`
  - `202603022246_users_and_fk.sql`, `202603031000_backend_hardening.sql`, `202603031230_phase3_cutover.sql`
  - `202603031001_rls_policies.sql`, `202603031002_indexes_partitioning.sql`, `202603031003_user_sessions.sql`
- Edge Function stubs:
  - shared prompt engine modules in `_shared/`
  - `supabase/functions/command-execute`
  - `supabase/functions/prd-generate`
  - `supabase/functions/prd-update`
  - `supabase/functions/prd-tickets-preview`
  - `supabase/functions/prd-tickets-push`
  - `supabase/functions/decisions-search`
  - `supabase/functions/decisions-detect`
  - `supabase/functions/digest-today`
  - `supabase/functions/integrations-status`
  - `supabase/functions/integrations-auth-start`
  - `supabase/functions/integrations-auth-callback`
  - `supabase/functions/integrations-refresh`
  - `supabase/functions/prompt-runs`
  - `supabase/functions/cutover-health`
  - `supabase/functions/methodologies`
  - `supabase/functions/methodologies-validate`
  - `supabase/functions/methodologies-recommend`
  - `supabase/functions/methodology-governance-report`
  - `supabase/functions/methodology-registry-version`
  - `supabase/functions/auth-magic-link`
  - `supabase/functions/auth-callback`
  - `supabase/functions/session`
  - `supabase/functions/logout`
  - `supabase/functions/onboarding-schema`
  - `supabase/functions/onboarding-answers`
  - `supabase/functions/onboarding-complete`
  - `supabase/functions/events`
  - `supabase/functions/prd-health-score`
  - `supabase/functions/stakeholder-update`

## Notes

- Free tier PRD quota is enforced as `3/month` in the mock backend.
- All mutating actions require explicit user confirmation.
- Citation policy is strict: missing evidence is marked as `No source found`.
- This repository currently ships with a functional local backend simulation. Replace `src/lib/apiClient.js` implementation with real network calls when deploying Supabase services.
- `src/lib/apiClient.js` now supports live endpoint mode:
  - set `VITE_USE_LIVE_API=true`
  - set `VITE_API_BASE_URL` to your API host
- For server-side provider calls and DB logging:
  - set `ANTHROPIC_API_KEY` (primary model provider)
  - optional `OPENAI_API_KEY` (fallback provider)
  - set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for prompt/context run persistence
- Cutover runbook:
  - `docs/CUTOVER_RUNBOOK.md`
  - smoke script: `scripts/cutover_smoke.sh`
