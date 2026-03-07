import { jsonWithCors, errorWithCors, handleCors } from '../_shared/cors.ts';
import { completeMagicCallback, markGoogleLogin } from '../_shared/authStore.ts';

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'GET') return errorWithCors(request, 'Method not allowed', 405, 'METHOD_NOT_ALLOWED');

  const url = new URL(request.url);
  const provider = url.searchParams.get('provider') || 'magic_link';
  const token = url.searchParams.get('token') || '';
  const workspaceId = url.searchParams.get('workspace_id') || request.headers.get('x-workspace-id') || 'ws_1';

  try {
    const session = provider === 'google' ? await markGoogleLogin(workspaceId) : await completeMagicCallback(workspaceId, provider, token);
    return jsonWithCors(request, session);
  } catch (err) {
    return errorWithCors(request, err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String(err.message) : 'Auth callback failed', 400, 'AUTH_CALLBACK_FAILED');
  }
});
