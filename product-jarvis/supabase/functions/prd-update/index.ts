import { body } from '../_shared/http.ts';
import { handleCors, jsonWithCors, errorWithCors } from '../_shared/cors.ts';
import { getPromptSchema } from '../_shared/prompts/registry.ts';
import { updatePrdRecord, logAuditEvent } from '../_shared/domainStore.ts';
import { validateRequiredKeys } from '../_shared/validation/schemaValidator.ts';

type PrdUpdateInput = {
  workspace_id: string;
  prd_id: string;
  body: Record<string, unknown>;
  version: number;
  approval_token: string;
};

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'POST') return errorWithCors(request, 'Method not allowed', 405, 'METHOD_NOT_ALLOWED');

  try {
    const payload = await body<PrdUpdateInput>(request);
    if (!payload.workspace_id || !payload.prd_id) {
      return errorWithCors(request, 'workspace_id and prd_id are required', 400, 'MISSING_PARAMS');
    }
    if (!payload.approval_token) {
      return errorWithCors(request, 'approval_token is required', 400, 'APPROVAL_REQUIRED');
    }
    if (!payload.body || typeof payload.body !== 'object') {
      return errorWithCors(request, 'body must be an object', 400, 'VALIDATION_ERROR');
    }

    const schema = await getPromptSchema('prd_generation');
    validateRequiredKeys(payload.body, schema.required);

    const updated = await updatePrdRecord({
      workspaceId: payload.workspace_id,
      prdId: payload.prd_id,
      version: Number(payload.version || 0),
      body: payload.body,
    });
    await logAuditEvent(payload.workspace_id, 'prd_updated', {
      prd_id: payload.prd_id,
      version_from: payload.version,
      version_to: updated.version,
    });

    return jsonWithCors(request, {
      id: updated.id,
      feature_request: updated.feature_request,
      body: updated.body,
      status: updated.status,
      version: updated.version,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
      citations: updated.citations,
      _meta: {
        approval_token_used: true,
        validation: 'passed',
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String(err.message) : 'PRD update failed';
    if (message.includes('VERSION_CONFLICT')) return errorWithCors(request, 'Version conflict detected', 409, 'VERSION_CONFLICT');
    if (message.includes('PRD_NOT_FOUND')) return errorWithCors(request, 'PRD not found', 404, 'PRD_NOT_FOUND');
    if (message.includes('Missing required keys')) return errorWithCors(request, message, 400, 'VALIDATION_ERROR');
    return errorWithCors(request, message, 400, 'PRD_UPDATE_FAILED');
  }
});
