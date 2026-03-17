import { jsonWithCors, errorWithCors, handleCors } from '../_shared/cors.ts';
import { createOauthState } from '../_shared/oauthStateStore.ts';

const SUPPORTED = new Set(['jira', 'linear', 'notion']);

type Provider = 'jira' | 'linear' | 'notion';

function buildAuthUrl(provider: Provider, state: string, redirectUri: string): string {
  if (provider === 'jira') {
    const clientId = Deno.env.get('JIRA_CLIENT_ID');
    if (!clientId) throw new Error('JIRA_CLIENT_ID not configured');
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'read:jira-work write:jira-work read:jira-user offline_access',
      state,
      prompt: 'consent',
    });
    return `https://auth.atlassian.com/authorize?audience=api.atlassian.com&${params.toString()}`;
  }

  if (provider === 'linear') {
    const clientId = Deno.env.get('LINEAR_CLIENT_ID');
    if (!clientId) throw new Error('LINEAR_CLIENT_ID not configured');
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'read,write,issues:create',
      state,
      prompt: 'consent',
    });
    return `https://linear.app/oauth/authorize?${params.toString()}`;
  }

  if (provider === 'notion') {
    const clientId = Deno.env.get('NOTION_CLIENT_ID');
    if (!clientId) throw new Error('NOTION_CLIENT_ID not configured');
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      owner: 'user',
      state,
    });
    return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
  }

  throw new Error(`Unknown provider: ${provider}`);
}

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'GET') return errorWithCors(request, 'Method not allowed', 405, 'METHOD_NOT_ALLOWED');

  const url = new URL(request.url);
  const provider = url.searchParams.get('provider') || '';
  const workspaceId = url.searchParams.get('workspace_id') || request.headers.get('x-workspace-id') || '';

  if (!SUPPORTED.has(provider)) {
    return errorWithCors(request, 'provider must be one of jira|linear|notion', 400, 'INVALID_PROVIDER');
  }

  if (!workspaceId) {
    return errorWithCors(request, 'workspace_id is required', 400, 'WORKSPACE_REQUIRED');
  }

  const redirectUri = Deno.env.get(`${provider.toUpperCase()}_REDIRECT_URI`)
    || 'https://auth.productjarvis.com/integrations/callback';

  try {
    const { state, expires_at } = createOauthState({
      workspace_id: workspaceId,
      provider: provider as Provider,
    });

    const authUrl = buildAuthUrl(provider as Provider, state, redirectUri);

    return jsonWithCors(request, {
      provider,
      workspace_id: workspaceId,
      state,
      auth_url: authUrl,
      redirect_uri: redirectUri,
      expires_at,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start OAuth';
    return errorWithCors(request, message, 500, 'OAUTH_START_FAILED');
  }
});
