import { jsonWithCors, errorWithCors, handleCors } from '../_shared/cors.ts';
import { performLogout } from '../_shared/authStore.ts';

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'POST') return errorWithCors(request, 'Method not allowed', 405, 'METHOD_NOT_ALLOWED');

  const workspaceId = request.headers.get('x-workspace-id') || 'ws_1';
  const session = await performLogout(workspaceId);
  return jsonWithCors(request, session);
});
