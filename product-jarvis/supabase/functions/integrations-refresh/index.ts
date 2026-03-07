import { body } from '../_shared/http.ts';
import { jsonWithCors, errorWithCors, handleCors } from '../_shared/cors.ts';
import { logAuditEvent } from '../_shared/domainStore.ts';
import { upsertIntegration } from '../_shared/integrationsStore.ts';

type RefreshInput = {
  workspace_id: string;
  provider: 'jira' | 'linear' | 'notion';
};

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'POST') return errorWithCors(request, 'Method not allowed', 405, 'METHOD_NOT_ALLOWED');

  const payload = await body<RefreshInput>(request);
  if (!payload.workspace_id || !payload.provider) {
    return errorWithCors(request, 'workspace_id and provider are required', 400, 'MISSING_PARAMS');
  }

  await upsertIntegration({
    workspace_id: payload.workspace_id,
    provider: payload.provider,
    status: 'connected',
    encrypted_tokens: 'encrypted:refresh',
    refresh_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
  });
  await logAuditEvent(payload.workspace_id, 'integration_refreshed', {
    provider: payload.provider,
  });

  return jsonWithCors(request, { provider: payload.provider, workspace_id: payload.workspace_id, status: 'connected' });
});
