import { jsonWithCors, errorWithCors, handleCors } from '../_shared/cors.ts';
import { createOauthState } from '../_shared/oauthStateStore.ts';

const SUPPORTED = new Set(['jira', 'linear', 'notion']);

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'GET') return errorWithCors(request, 'Method not allowed', 405, 'METHOD_NOT_ALLOWED');

  const url = new URL(request.url);
  const provider = url.searchParams.get('provider') || '';
  const workspaceId = url.searchParams.get('workspace_id') || request.headers.get('x-workspace-id') || '';
  const redirectUri = url.searchParams.get('redirect_uri') || '';

  if (!SUPPORTED.has(provider)) {
    return errorWithCors(request, 'provider must be one of jira|linear|notion', 400, 'INVALID_PROVIDER');
  }

  if (!workspaceId) {
    return errorWithCors(request, 'workspace_id is required', 400, 'WORKSPACE_REQUIRED');
  }

  const { state, dev_authorization_code, expires_at } = createOauthState({
    workspace_id: workspaceId,
    provider: provider as 'jira' | 'linear' | 'notion',
  });
  const callback = redirectUri || 'https://example.com/oauth/callback';
  const authUrl = `${callback}?provider=${provider}&state=${state}&workspace_id=${workspaceId}`;

  return jsonWithCors(request, {
    provider,
    workspace_id: workspaceId,
    state,
    auth_url: authUrl,
    dev_authorization_code,
    expires_at,
  });
});
