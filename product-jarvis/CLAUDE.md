# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ProductJarvis is an AI product operating system for PM teams. It provides:
- Command Bar for natural-language intent routing
- PRD Generator with strict JSON structure and inline editing
- Ticket Factory for Jira/Linear with preview/push flow
- Decision Memory with source citations
- Daily Digest with confidence labeling

**Tech Stack:**
- Frontend: Vite 7 + React 19 + React Router v7 + vanilla CSS
- Backend: Supabase (PostgreSQL + Edge Functions in Deno)
- LLM: Claude (primary) via Anthropic API, OpenAI (fallback)
- Deployment: Vercel (frontend), Supabase (backend)

## Development Commands

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Analyze bundle size (opens visualizer)
npm run analyze

# Lint code
npm run lint
```

## Backend Development (Supabase)

```bash
# Link to Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations (run in order)
supabase db push

# Deploy all Edge Functions
./scripts/deploy.sh

# Deploy single Edge Function
supabase functions deploy <function-name> --no-verify-jwt

# Run cutover smoke tests
API_BASE=https://YOUR_PROJECT_REF.supabase.co/functions/v1 ./scripts/cutover_smoke.sh
```

## Architecture

### Frontend Structure

```
src/
├── main.jsx              # Entry point: Sentry, PostHog, service worker, Web Vitals
├── App.jsx               # Routes, auth guards, lazy loading, workspace shell
├── context/
│   └── AppContext.jsx    # Global state: session, auth, API client
├── lib/
│   ├── apiClient.js      # API abstraction (mock vs live mode)
│   ├── mockBackend.js    # Local mock backend (contract-compatible)
│   ├── supabaseClient.js # Supabase client (supports VITE_* and NEXT_PUBLIC_* env vars)
│   ├── env.js            # Centralized env config with validation
│   ├── sentry.js         # Sentry init/helpers
│   ├── posthog.js        # PostHog init/helpers
│   ├── performance.js    # Web Vitals, prefetchRoute, debounce, throttle
│   ├── aiClient.js       # AI streaming helpers
│   └── contracts.js      # API contract types and validators
├── components/           # Feature components (lazy-loaded)
├── pages/                # Route pages
└── index.css            # Global styles
```

### Backend Structure

```
supabase/
├── migrations/           # PostgreSQL migrations (run in order)
│   ├── 202603021700_init.sql
│   ├── 202603021930_prompt_engine.sql
│   ├── 202603022130_methodology_engine.sql
│   ├── 202603022245_auth_onboarding_ux.sql
│   ├── 202603022246_users_and_fk.sql
│   ├── 202603031000_backend_hardening.sql
│   ├── 202603031001_rls_policies.sql
│   ├── 202603031002_indexes_partitioning.sql
│   ├── 202603031003_user_sessions.sql
│   ├── 202603031230_phase3_cutover.sql
│   └── 202603061000_evidence_rag.sql
└── functions/            # Edge Functions (Deno runtime)
    ├── _shared/          # Shared modules
    │   ├── promptEngine.ts      # Prompt execution engine
    │   ├── llm/                 # LLM provider routing (Claude primary, OpenAI fallback)
    │   ├── pipelines/           # Prompt pipelines (7 core prompts)
    │   ├── context/             # Context assembly
    │   ├── validation/          # JSON schema validation
    │   ├── storage.ts           # Run logging
    │   ├── authStore.ts         # Auth helpers
    │   ├── domainStore.ts       # Domain logic
    │   └── cors.ts              # CORS handling
    ├── command-execute/
    ├── prd-generate/
    ├── prd-update/
    ├── prd-tickets-preview/
    ├── prd-tickets-push/
    ├── decisions-search/
    ├── digest-today/
    └── [28 more functions...]
```

## Key Architectural Patterns

### 1. Dual-Mode API Client
- `src/lib/apiClient.js` switches between mock and live mode via `VITE_USE_LIVE_API`
- Mock backend (`src/lib/mockBackend.js`) provides contract-compatible responses
- All API responses are normalized to consistent shapes

### 2. Component Export Convention
- **Components use default exports** (not named exports)
- Lazy imports: `lazy(() => import('./Component'))`
- Exception: `FeedbackWidget` is a named export, requires: `lazy(() => import('./components/FeedbackWidget').then(m => ({ default: m.FeedbackWidget })))`

### 3. Environment Variables
- Frontend uses `VITE_*` prefix (Vite standard)
- Also supports `NEXT_PUBLIC_*` prefix for Vercel/Supabase compatibility
- `src/lib/env.js` centralizes all env config with validation
- Required in production: `SUPABASE_URL`, `SUPABASE_ANON_KEY`

### 4. Auth Flow
- Supabase Auth for real authentication (`supaSession` in AppContext)
- Mock session for product data (`session` in AppContext)
- Auth guards in `App.jsx` redirect based on authentication + onboarding status
- Routes: `/auth` → `/welcome` (onboarding) → `/workspace/*` (authenticated)

### 5. Prompt Engine (Backend)
- Versioned prompt assets in `supabase/functions/_shared/prompts/`
- Shared execution engine with context assembly, provider routing, validation
- 7 core pipelines: `prd_generation`, `ticket_factory`, `decision_detection`, `daily_digest`, `command_router`, `prd_health`, `stakeholder_update`
- All responses include citations or explicit "No source found" markers

### 6. Bundle Optimization
- Manual chunks: `vendor-react`, `vendor-supabase`, `vendor-sentry`, `vendor-ui`
- Lazy-loaded routes and components
- Service worker (`public/sw.js`): cache-first for static assets, network-first for HTML
- Known: `vendor-supabase` chunk appears empty (Vite 7/Rollup behavior — supabase internals bundle into index chunk)

## Environment Setup

1. Copy `.env.example` to `.env.local`
2. Fill in required variables:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY` or `ANTHROPIC_AUTH_TOKEN` (for Quatarly gateway)
   - Optional: `OPENAI_API_KEY` (fallback provider)
3. Frontend-specific:
   - `VITE_USE_LIVE_API=true` (enable live API mode)
   - `VITE_API_BASE_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1`
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
4. Optional observability:
   - `VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY`

## Deployment

### One-Command Deploy (Backend + Frontend)
```bash
./scripts/deploy.sh
```

This script:
1. Links Supabase project
2. Pushes all migrations
3. Sets Edge Function secrets
4. Deploys all 30+ Edge Functions
5. Builds frontend

### Manual Deploy
```bash
# Backend
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... ANTHROPIC_API_KEY=...
supabase functions deploy <function-name> --no-verify-jwt

# Frontend (Vercel)
npm run build
vercel --prod
```

### Post-Deploy Validation
```bash
# Run smoke tests
API_BASE=https://YOUR_PROJECT_REF.supabase.co/functions/v1 ./scripts/cutover_smoke.sh

# Check cutover health
curl https://YOUR_PROJECT_REF.supabase.co/functions/v1/cutover-health
```

See `DEPLOY.md` and `docs/CUTOVER_RUNBOOK.md` for detailed deployment procedures.

## Important Constraints

### Frontend
- All mutating actions require explicit user confirmation
- Citations are mandatory: missing evidence is marked as "No source found"
- Free tier PRD quota: 3/month (enforced in mock backend)
- Components must handle loading, error, and empty states explicitly

### Backend
- Edge Functions use `--no-verify-jwt` (custom auth via `authStore.ts`)
- All prompt responses must pass JSON schema validation
- Provider fallback: Claude → OpenAI (if Claude fails)
- Rate limiting: in-memory per function instance + DB-backed usage quotas
- CORS: configured via `CORS_ALLOWED_ORIGINS` secret

### Database
- RLS policies enforce workspace isolation
- Migrations must run in order (see `docs/CUTOVER_RUNBOOK.md`)
- Indexes and partitioning configured for prompt_runs table
- User sessions stored in `user_sessions` table (persistent)

## Testing & Validation

- Smoke tests: `scripts/cutover_smoke.sh` validates 7 critical endpoints
- Cutover health: `GET /api/cutover-health` returns operational metrics
- Prompt runs: `GET /api/prompt-runs` shows execution history and validation failures
- Integration status: `GET /api/integrations/status` checks connected services

## Common Patterns

### Adding a New API Endpoint
1. Create Edge Function in `supabase/functions/<name>/index.ts`
2. Add shared logic to `supabase/functions/_shared/` if reusable
3. Add mock implementation to `src/lib/mockBackend.js`
4. Add live implementation to `src/lib/apiClient.js`
5. Update `src/lib/contracts.js` with types/validators
6. Deploy: `supabase functions deploy <name> --no-verify-jwt`

### Adding a New Prompt Pipeline
1. Create template in `supabase/functions/_shared/prompts/templates/<name>.md`
2. Create schema in `supabase/functions/_shared/prompts/schemas/<name>.json`
3. Create pipeline in `supabase/functions/_shared/pipelines/<name>.ts`
4. Register in `promptEngine.ts`
5. Create Edge Function that calls the pipeline

### Adding a New Component
1. Create component in `src/components/<Name>.jsx` with **default export**
2. Add lazy import in `App.jsx`: `const Name = lazy(() => import('./components/Name'))`
3. Add route or integrate into existing component
4. Ensure loading/error states are handled

## Observability

- **Sentry**: Error tracking, user context, workspace context
- **PostHog**: Analytics, feature flags, Web Vitals
- **Web Vitals**: CLS, FID, LCP, FCP, TTFB reported to PostHog in production
- **Service Worker**: Logs registration status to console

## Known Issues & Quirks

- `vendor-supabase` chunk appears empty in bundle analyzer (Vite 7/Rollup behavior — internals bundle into index chunk)
- `FeedbackWidget` requires special lazy import syntax (named export)
- Supabase client supports both `VITE_*` and `NEXT_PUBLIC_*` env prefixes for compatibility
- Mock backend uses localStorage key `productjarvis.db.v1` for persistence
