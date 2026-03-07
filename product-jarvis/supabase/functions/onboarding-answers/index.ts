import { body } from '../_shared/http.ts';
import { jsonWithCors, errorWithCors, handleCors } from '../_shared/cors.ts';
import { saveOnboardingAnswer } from '../_shared/authStore.ts';

type Payload = {
  workspace_id?: string;
  step_id: string;
  payload: Record<string, unknown>;
};

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'POST') return errorWithCors(request, 'Method not allowed', 405, 'METHOD_NOT_ALLOWED');

  const data = await body<Payload>(request);
  if (!data.step_id) return errorWithCors(request, 'step_id is required', 400, 'STEP_REQUIRED');

  const workspaceId = data.workspace_id || request.headers.get('x-workspace-id') || 'ws_1';
  const result = await saveOnboardingAnswer(workspaceId, data.step_id, data.payload || {});
  return jsonWithCors(request, result);
});
