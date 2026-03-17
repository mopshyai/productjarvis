import { body } from '../_shared/http.ts';
import { jsonWithCors, errorWithCors, handleCors } from '../_shared/cors.ts';
import { logAuditEvent } from '../_shared/domainStore.ts';
import { upsertIntegration, getIntegrationStatus } from '../_shared/integrationsStore.ts';
import { encryptToken, decryptToken } from '../_shared/tokenEncryption.ts';

type RefreshInput = {
  workspace_id: string;
  provider: 'jira' | 'linear' | 'notion';
};

type StoredTokens = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  obtained_at?: string;
};

async function refreshProviderToken(provider: 'jira' | 'linear' | 'notion', refreshToken: string): Promise<StoredTokens> {
  if (provider === 'jira') {
    const clientId = Deno.env.get('JIRA_CLIENT_ID');
    const clientSecret = Deno.env.get('JIRA_CLIENT_SECRET');
    if (!clientId || !clientSecret) throw new Error('Jira OAuth credentials not configured');

    const res = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Jira token refresh failed: ${err}`);
    }
    return res.json();
  }

  if (provider === 'linear') {
    // Linear tokens don't expire (no refresh_token flow), just return existing
    throw new Error('Linear tokens do not require refresh');
  }

  if (provider === 'notion') {
    // Notion tokens do not expire, no refresh needed
    throw new Error('Notion tokens do not require refresh');
  }

  throw new Error(`Unknown provider: ${provider}`);
}

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'POST') return errorWithCors(request, 'Method not allowed', 405, 'METHOD_NOT_ALLOWED');

  const payload = await body<RefreshInput>(request);
  if (!payload.workspace_id || !payload.provider) {
    return errorWithCors(request, 'workspace_id and provider are required', 400, 'MISSING_PARAMS');
  }

  try {
    const integrations = await getIntegrationStatus(payload.workspace_id);
    const current = integrations.find((i) => i.provider === payload.provider);

    if (!current?.connected) {
      return errorWithCors(request, `${payload.provider} is not connected`, 400, 'NOT_CONNECTED');
    }

    // For providers that don't need refresh (Linear, Notion), just confirm connected
    if (payload.provider === 'linear' || payload.provider === 'notion') {
      return jsonWithCors(request, {
        provider: payload.provider,
        workspace_id: payload.workspace_id,
        status: 'connected',
        refreshed: false,
      });
    }

    // For Jira — attempt token refresh
    const encryptedRaw = (current as { encrypted_tokens?: string }).encrypted_tokens;
    if (!encryptedRaw) {
      return errorWithCors(request, 'No stored tokens found', 400, 'NO_TOKENS');
    }

    let storedTokens: StoredTokens;
    try {
      const decrypted = await decryptToken(encryptedRaw);
      storedTokens = JSON.parse(decrypted);
    } catch {
      return errorWithCors(request, 'Failed to decrypt stored tokens', 500, 'DECRYPT_FAILED');
    }

    if (!storedTokens.refresh_token) {
      return errorWithCors(request, 'No refresh token available', 400, 'NO_REFRESH_TOKEN');
    }

    const newTokens = await refreshProviderToken(payload.provider, storedTokens.refresh_token);

    const tokensJson = JSON.stringify({
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token || storedTokens.refresh_token,
      expires_in: newTokens.expires_in || null,
      token_type: newTokens.token_type || 'Bearer',
      obtained_at: new Date().toISOString(),
    });

    const encryptedTokens = await encryptToken(tokensJson);
    const refreshAt = newTokens.expires_in
      ? new Date(Date.now() + newTokens.expires_in * 1000 * 0.8).toISOString()
      : new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();

    await upsertIntegration({
      workspace_id: payload.workspace_id,
      provider: payload.provider,
      status: 'connected',
      encrypted_tokens: encryptedTokens,
      refresh_at: refreshAt,
    });

    await logAuditEvent(payload.workspace_id, 'integration_refreshed', { provider: payload.provider });

    return jsonWithCors(request, {
      provider: payload.provider,
      workspace_id: payload.workspace_id,
      status: 'connected',
      refreshed: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token refresh failed';
    return errorWithCors(request, message, 500, 'REFRESH_FAILED');
  }
});
