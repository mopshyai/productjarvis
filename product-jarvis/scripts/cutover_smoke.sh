#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:54321/functions/v1}"
WORKSPACE_ID="${WORKSPACE_ID:-ws_1}"
TRACKER="${TRACKER:-jira}"

echo "[1/7] auth callback"
curl -sS -f "${API_BASE}/auth-callback?provider=google&token=smoke&workspace_id=${WORKSPACE_ID}" >/tmp/pj_auth.json

echo "[2/7] prd generate"
curl -sS -f -X POST "${API_BASE}/prd-generate" \
  -H "Content-Type: application/json" \
  -d "{\"workspace_id\":\"${WORKSPACE_ID}\",\"feature_request\":\"Smoke test feature\",\"product_context\":{\"okrs\":[\"Reliability\"]}}" \
  >/tmp/pj_prd_generate.json

PRD_ID="$(jq -r '.id // empty' /tmp/pj_prd_generate.json)"
PRD_VERSION="$(jq -r '.version // 1' /tmp/pj_prd_generate.json)"
PRD_BODY="$(jq -c '.body // {}' /tmp/pj_prd_generate.json)"

if [[ -z "${PRD_ID}" ]]; then
  echo "Missing PRD id from generate response"
  cat /tmp/pj_prd_generate.json
  exit 1
fi

echo "[3/7] prd update"
curl -sS -f -X POST "${API_BASE}/prd-update" \
  -H "Content-Type: application/json" \
  -d "{\"workspace_id\":\"${WORKSPACE_ID}\",\"prd_id\":\"${PRD_ID}\",\"body\":${PRD_BODY},\"version\":${PRD_VERSION},\"approval_token\":\"confirm_save_prd\"}" \
  >/tmp/pj_prd_update.json

echo "[4/7] ticket preview"
curl -sS -f -X POST "${API_BASE}/prd-tickets-preview" \
  -H "Content-Type: application/json" \
  -d "{\"workspace_id\":\"${WORKSPACE_ID}\",\"prd_id\":\"${PRD_ID}\",\"prd_content\":${PRD_BODY},\"tracker\":\"${TRACKER}\",\"constraints\":{\"count\":10}}" \
  >/tmp/pj_ticket_preview.json

echo "[5/7] integration connect (simulated oauth handoff)"
START_JSON="$(curl -sS -f "${API_BASE}/integrations-auth-start?provider=${TRACKER}&workspace_id=${WORKSPACE_ID}")"
STATE="$(echo "${START_JSON}" | jq -r '.state // empty')"
CODE="$(echo "${START_JSON}" | jq -r '.dev_authorization_code // empty')"
curl -sS -f "${API_BASE}/integrations-auth-callback?provider=${TRACKER}&workspace_id=${WORKSPACE_ID}&code=${CODE}&state=${STATE}" >/tmp/pj_integration_connected.json

echo "[6/7] ticket push"
curl -sS -f -X POST "${API_BASE}/prd-tickets-push" \
  -H "Content-Type: application/json" \
  -d "{\"workspace_id\":\"${WORKSPACE_ID}\",\"prd_id\":\"${PRD_ID}\",\"tracker\":\"${TRACKER}\",\"project_id\":\"CORE\",\"mapping_profile_id\":\"default-map\",\"approval_token\":\"confirm_push_tickets\"}" \
  >/tmp/pj_ticket_push.json

echo "[7/7] decision search + digest + cutover health"
curl -sS -f -X POST "${API_BASE}/decisions-search" \
  -H "Content-Type: application/json" \
  -d "{\"workspace_id\":\"${WORKSPACE_ID}\",\"query\":\"mobile\"}" >/tmp/pj_decision_search.json
curl -sS -f "${API_BASE}/digest-today?workspace_id=${WORKSPACE_ID}" >/tmp/pj_digest.json
curl -sS -f "${API_BASE}/cutover-health?workspace_id=${WORKSPACE_ID}" >/tmp/pj_cutover_health.json

echo "Smoke run completed."
