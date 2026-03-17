#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()   { echo -e "${GREEN}[deploy]${NC} $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC} $*"; }
fail()  { echo -e "${RED}[error]${NC} $*"; exit 1; }

# --- Pre-flight checks ---
command -v supabase >/dev/null 2>&1 || fail "supabase CLI not found. Install: https://supabase.com/docs/guides/cli"
command -v node >/dev/null 2>&1     || fail "node not found"

cd "$PROJECT_DIR"

if [ ! -f .env.local ]; then
  fail ".env.local not found. Copy .env.example to .env.local and fill in your values."
fi

# Load env
set -a
source .env.local
set +a

[ -z "${SUPABASE_URL:-}" ]              && fail "SUPABASE_URL is not set in .env.local"
[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]  && fail "SUPABASE_SERVICE_ROLE_KEY is not set in .env.local"
# Require at least one LLM auth credential
if [ -z "${ANTHROPIC_AUTH_TOKEN:-}" ] && [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  fail "Neither ANTHROPIC_AUTH_TOKEN nor ANTHROPIC_API_KEY is set in .env.local"
fi

PROJECT_REF=$(echo "$SUPABASE_URL" | sed -n 's|https://\([^.]*\)\.supabase\.co.*|\1|p')
[ -z "$PROJECT_REF" ] && fail "Could not extract project ref from SUPABASE_URL"

log "Project ref: $PROJECT_REF"

# --- Link Supabase project ---
log "Linking Supabase project..."
supabase link --project-ref "$PROJECT_REF"

# --- Run migrations ---
log "Pushing database migrations..."
supabase db push

# --- Set Edge Function secrets ---
log "Setting Edge Function secrets..."
supabase secrets set \
  SUPABASE_URL="$SUPABASE_URL" \
  SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  ${ANTHROPIC_AUTH_TOKEN:+ANTHROPIC_AUTH_TOKEN="$ANTHROPIC_AUTH_TOKEN"} \
  ${ANTHROPIC_API_KEY:+ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"} \
  ${ANTHROPIC_BASE_URL:+ANTHROPIC_BASE_URL="$ANTHROPIC_BASE_URL"} \
  ${ANTHROPIC_DEFAULT_HAIKU_MODEL:+ANTHROPIC_DEFAULT_HAIKU_MODEL="$ANTHROPIC_DEFAULT_HAIKU_MODEL"} \
  ${ANTHROPIC_DEFAULT_SONNET_MODEL:+ANTHROPIC_DEFAULT_SONNET_MODEL="$ANTHROPIC_DEFAULT_SONNET_MODEL"} \
  ${ANTHROPIC_DEFAULT_OPUS_MODEL:+ANTHROPIC_DEFAULT_OPUS_MODEL="$ANTHROPIC_DEFAULT_OPUS_MODEL"} \
  ${OPENAI_API_KEY:+OPENAI_API_KEY="$OPENAI_API_KEY"} \
  ${OPENAI_BASE_URL:+OPENAI_BASE_URL="$OPENAI_BASE_URL"} \
  ${CORS_ALLOWED_ORIGINS:+CORS_ALLOWED_ORIGINS="$CORS_ALLOWED_ORIGINS"} \
  ${CLAUDE_MODEL:+CLAUDE_MODEL="$CLAUDE_MODEL"} \
  ${CLAUDE_TIMEOUT_MS:+CLAUDE_TIMEOUT_MS="$CLAUDE_TIMEOUT_MS"}

# --- Deploy all Edge Functions ---
FUNCTIONS_DIR="$PROJECT_DIR/supabase/functions"
log "Deploying Edge Functions..."

for func_dir in "$FUNCTIONS_DIR"/*/; do
  func_name=$(basename "$func_dir")
  [ "$func_name" = "_shared" ] && continue

  log "  Deploying $func_name..."
  supabase functions deploy "$func_name" --no-verify-jwt
done

log "All Edge Functions deployed."

# --- Build frontend ---
log "Building frontend..."
npm run build

log ""
log "============================================"
log "  Deployment complete!"
log "============================================"
log ""
log "Canonical public API base URL: https://api.productjarvis.com"
log ""
log "Next steps:"
log "  1. Set these Vercel env vars:"
log "     VITE_USE_LIVE_API=true"
log "     VITE_API_BASE_URL=https://api.productjarvis.com"
log ""
log "  2. Deploy frontend: vercel --prod"
log ""
log "  3. Add your Vercel URL to CORS_ALLOWED_ORIGINS:"
log "     supabase secrets set CORS_ALLOWED_ORIGINS=\"http://localhost:5173,https://your-app.vercel.app\""
log ""
log "  4. Run smoke test: ./scripts/cutover_smoke.sh"
log ""
