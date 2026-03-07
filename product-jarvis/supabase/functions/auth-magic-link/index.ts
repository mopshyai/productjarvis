import { body } from '../_shared/http.ts';
import { jsonWithCors, errorWithCors, handleCors } from '../_shared/cors.ts';
import { sendMagicLink } from '../_shared/authStore.ts';

type Payload = {
  email: string;
  workspace_id?: string;
};

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'POST') return errorWithCors(request, 'Method not allowed', 405, 'METHOD_NOT_ALLOWED');

  const payload = await body<Payload>(request);
  if (!payload.email || !payload.email.includes('@')) {
    return errorWithCors(request, 'Valid email is required', 400, 'INVALID_EMAIL');
  }

  const workspaceId = payload.workspace_id || request.headers.get('x-workspace-id') || 'ws_1';
  const result = await sendMagicLink(workspaceId, payload.email);
  return jsonWithCors(request, result);
});
