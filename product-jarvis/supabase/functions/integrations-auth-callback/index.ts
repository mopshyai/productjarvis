import { jsonWithCors, errorWithCors, handleCors } from '../_shared/cors.ts';
import { logAuditEvent } from '../_shared/domainStore.ts';
import { upsertIntegration } from '../_shared/integrationsStore.ts';
import { consumeOauthState } from '../_shared/oauthStateStore.ts';

const SUPPORTED = new Set(['jira', 'linear', 'notion']);

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'GET') return errorWithCors(request, 'Method not allowed', 405, 'METHOD_NOT_ALLOWED');

  const url = new URL(request.url);
  const provider = url.searchParams.get('provider') || '';
  const workspaceId = url.searchParams.get('workspace_id') || '';
  const code = url.searchParams.get('code') || '';
  const state = request.headers.get('x-oauth-state') || url.searchParams.get('state') || '';

  if (!SUPPORTED.has(provider)) {
    return errorWithCors(request, 'provider must be one of jira|linear|notion', 400, 'INVALID_PROVIDER');
  }

  if (!workspaceId) {
    return errorWithCors(request, 'workspace_id is required', 400, 'MISSING_PARAMS');
  }

  if (!state) {
    return errorWithCors(request, 'state is required', 400, 'MISSING_STATE');
  }

  const stateRow = consumeOauthState(state);
  if (!stateRow) {
    return errorWithCors(request, 'oauth state is invalid or expired', 400, 'INVALID_STATE');
  }

  if (stateRow.workspace_id !== workspaceId || stateRow.provider !== provider) {
    return errorWithCors(request, 'oauth state mismatch', 400, 'INVALID_STATE');
  }

  const authorizationCode = code || stateRow.dev_authorization_code;
  if (!authorizationCode) {
    return errorWithCors(request, 'authorization code is required', 400, 'MISSING_PARAMS');
  }

  await upsertIntegration({
    workspace_id: workspaceId,
    provider: provider as 'jira' | 'linear' | 'notion',
    status: 'connected',
    encrypted_tokens: `encrypted:${authorizationCode}`,
    refresh_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
  });
  await logAuditEvent(workspaceId, 'integration_connected', {
    provider,
    source: 'oauth_callback',
  });

  return jsonWithCors(request, { provider, workspace_id: workspaceId, status: 'connected', refresh_required: false });
});
