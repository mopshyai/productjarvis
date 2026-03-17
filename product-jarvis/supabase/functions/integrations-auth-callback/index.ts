import { jsonWithCors, errorWithCors, handleCors } from '../_shared/cors.ts';
import { logAuditEvent } from '../_shared/domainStore.ts';
import { upsertIntegration } from '../_shared/integrationsStore.ts';
import { consumeOauthState } from '../_shared/oauthStateStore.ts';
import { encryptToken } from '../_shared/tokenEncryption.ts';

const SUPPORTED = new Set(['jira', 'linear', 'notion']);
type Provider = 'jira' | 'linear' | 'notion';

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

async function exchangeCodeForToken(provider: Provider, code: string, redirectUri: string): Promise<TokenResponse> {
  if (provider === 'jira') {
    const clientId = Deno.env.get('JIRA_CLIENT_ID');
    const clientSecret = Deno.env.get('JIRA_CLIENT_SECRET');
    if (!clientId || !clientSecret) throw new Error('Jira OAuth credentials not configured');

    const res = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Jira token exchange failed: ${err}`);
    }
    return res.json();
  }

  if (provider === 'linear') {
    const clientId = Deno.env.get('LINEAR_CLIENT_ID');
    const clientSecret = Deno.env.get('LINEAR_CLIENT_SECRET');
    if (!clientId || !clientSecret) throw new Error('Linear OAuth credentials not configured');

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    });

    const res = await fetch('https://api.linear.app/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Linear token exchange failed: ${err}`);
    }
    return res.json();
  }

  if (provider === 'notion') {
    const clientId = Deno.env.get('NOTION_CLIENT_ID');
    const clientSecret = Deno.env.get('NOTION_CLIENT_SECRET');
    if (!clientId || !clientSecret) throw new Error('Notion OAuth credentials not configured');

    const credentials = btoa(`${clientId}:${clientSecret}`);
    const redirectUriForNotion = Deno.env.get('NOTION_REDIRECT_URI') || redirectUri;

    const res = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUriForNotion,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Notion token exchange failed: ${err}`);
    }
    return res.json();
  }

  throw new Error(`Unknown provider: ${provider}`);
}

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

  if (!code) {
    return errorWithCors(request, 'authorization code is required', 400, 'MISSING_CODE');
  }

  const stateRow = consumeOauthState(state);
  if (!stateRow) {
    return errorWithCors(request, 'oauth state is invalid or expired', 400, 'INVALID_STATE');
  }

  if (stateRow.workspace_id !== workspaceId || stateRow.provider !== provider) {
    return errorWithCors(request, 'oauth state mismatch', 400, 'INVALID_STATE');
  }

  try {
    const redirectUri = Deno.env.get(`${provider.toUpperCase()}_REDIRECT_URI`)
      || 'https://auth.productjarvis.com/integrations/callback';

    const tokenData = await exchangeCodeForToken(provider as Provider, code, redirectUri);

    const tokensJson = JSON.stringify({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      expires_in: tokenData.expires_in || null,
      token_type: tokenData.token_type || 'Bearer',
      obtained_at: new Date().toISOString(),
    });

    const encryptedTokens = await encryptToken(tokensJson);

    const refreshAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000 * 0.8).toISOString()
      : new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();

    await upsertIntegration({
      workspace_id: workspaceId,
      provider: provider as Provider,
      status: 'connected',
      encrypted_tokens: encryptedTokens,
      refresh_at: refreshAt,
    });

    await logAuditEvent(workspaceId, 'integration_connected', {
      provider,
      source: 'oauth_callback',
    });

    return jsonWithCors(request, { provider, workspace_id: workspaceId, status: 'connected', refresh_required: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token exchange failed';
    return errorWithCors(request, message, 500, 'TOKEN_EXCHANGE_FAILED');
  }
});
