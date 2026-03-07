# ProductJarvis Deployment Guide

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed (`brew install supabase/tap/supabase`)
- [Node.js](https://nodejs.org/) 18+
- [Vercel CLI](https://vercel.com/docs/cli) (`npm i -g vercel`)
- A Supabase project (create at https://supabase.com/dashboard)
- An Anthropic API key (https://console.anthropic.com/)

## Step 1: Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:

| Variable | Where to find it |
|----------|-----------------|
| `SUPABASE_URL` | Supabase Dashboard > Settings > API > Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard > Settings > API > Service role key |
| `SUPABASE_ANON_KEY` | Supabase Dashboard > Settings > API > anon public key |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com/settings/keys |
| `OPENAI_API_KEY` | (optional) https://platform.openai.com/api-keys |

Set the API base URL:
```
VITE_API_BASE_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1
```

## Step 2: Deploy Backend (One Command)

```bash
./scripts/deploy.sh
```

This will:
1. Link your Supabase project
2. Push all 10 database migrations
3. Set Edge Function secrets (API keys, Supabase credentials)
4. Deploy all 30 Edge Functions
5. Build the frontend

## Step 3: Deploy Frontend to Vercel

```bash
vercel --prod
```

When prompted, set these environment variables in Vercel:

| Variable | Value |
|----------|-------|
| `VITE_USE_LIVE_API` | `true` |
| `VITE_API_BASE_URL` | `https://YOUR_PROJECT_REF.supabase.co/functions/v1` |

Or set them in the Vercel dashboard: Project Settings > Environment Variables.

## Step 4: Update CORS

After Vercel gives you a production URL, add it to the allowed origins:

```bash
supabase secrets set CORS_ALLOWED_ORIGINS="http://localhost:5173,https://your-app.vercel.app,https://productjarvis.com"
```

## Step 5: Smoke Test

```bash
API_BASE=https://YOUR_PROJECT_REF.supabase.co/functions/v1 ./scripts/cutover_smoke.sh
```

All 7 checks should pass. See `docs/CUTOVER_RUNBOOK.md` for pass criteria.

---

## Manual Deployment (Step by Step)

If you prefer to deploy manually instead of using `deploy.sh`:

### Link project
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### Push migrations
```bash
supabase db push
```

### Set secrets
```bash
supabase secrets set \
  SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=your-key \
  ANTHROPIC_API_KEY=sk-ant-your-key
```

### Deploy a single function
```bash
supabase functions deploy command-execute --no-verify-jwt
```

### Deploy all functions
```bash
for f in supabase/functions/*/; do
  name=$(basename "$f")
  [ "$name" = "_shared" ] && continue
  supabase functions deploy "$name" --no-verify-jwt
done
```

### Build and deploy frontend
```bash
npm run build
vercel --prod
```

---

## Architecture Overview

```
Browser (Vercel)  -->  Supabase Edge Functions  -->  Claude API (primary)
                                |                         |
                                v                    OpenAI (fallback)
                          PostgreSQL DB
                    (migrations, RLS, indexes)
```

- Frontend: React + Vite on Vercel
- Backend: 30 Supabase Edge Functions (Deno runtime)
- LLM: Claude (primary) with OpenAI fallback
- DB: Supabase PostgreSQL with RLS policies
- Rate limiting: In-memory per function instance + DB-backed usage quotas
