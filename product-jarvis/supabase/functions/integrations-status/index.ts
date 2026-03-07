import { jsonWithCors, errorWithCors, handleCors } from '../_shared/cors.ts';
import { getIntegrationStatus } from '../_shared/integrationsStore.ts';

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'GET') return errorWithCors(request, 'Method not allowed', 405, 'METHOD_NOT_ALLOWED');

  const workspaceId = request.headers.get('x-workspace-id') || new URL(request.url).searchParams.get('workspace_id');
  if (!workspaceId) {
    return errorWithCors(request, 'workspace_id is required', 400, 'WORKSPACE_REQUIRED');
  }

  const integrations = await getIntegrationStatus(workspaceId);
  return jsonWithCors(request, { workspace_id: workspaceId, integrations });
});
