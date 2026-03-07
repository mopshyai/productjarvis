import { body } from '../_shared/http.ts';
import { jsonWithCors, errorWithCors, handleCors } from '../_shared/cors.ts';
import { completeOnboarding } from '../_shared/authStore.ts';

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'POST') return errorWithCors(request, 'Method not allowed', 405, 'METHOD_NOT_ALLOWED');

  const payload = await body<Record<string, unknown>>(request);
  const workspaceId = String(payload.workspace_id || request.headers.get('x-workspace-id') || 'ws_1');
  const session = await completeOnboarding(workspaceId, payload);
  return jsonWithCors(request, session);
});
