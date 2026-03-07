import { jsonWithCors, errorWithCors, handleCors } from '../_shared/cors.ts';
import { getSessionState, hydrateFeatureFlags, persistSession } from '../_shared/authStore.ts';
import { getIntegrationStatus } from '../_shared/integrationsStore.ts';

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'GET') return errorWithCors(request, 'Method not allowed', 405, 'METHOD_NOT_ALLOWED');

  const workspaceId = request.headers.get('x-workspace-id') || new URL(request.url).searchParams.get('workspace_id') || 'ws_1';
  let session = await getSessionState(workspaceId);
  session = await hydrateFeatureFlags(workspaceId);
  const statuses = await getIntegrationStatus(workspaceId);
  session.integrations = statuses.reduce(
    (acc, item) => ({
      ...acc,
      [item.provider]: {
        connected: item.connected,
        status: item.status,
      },
    }),
    {}
  );
  await persistSession(workspaceId, session);
  return jsonWithCors(request, session);
});
