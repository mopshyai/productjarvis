import { body } from '../_shared/http.ts';
import { handleCors, jsonWithCors, errorWithCors } from '../_shared/cors.ts';
import { runPrdHealth } from '../_shared/pipelines/prdHealth.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';

type PrdHealthInput = {
  workspace_id: string;
  prd_content: Record<string, unknown>;
  context?: Record<string, unknown>;
  methodology_request?: {
    mode?: 'auto' | 'manual';
    primary?: string;
    supporting?: string[];
    exclude?: string[];
  };
};

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'POST') return errorWithCors(request, 'Method not allowed', 405, 'METHOD_NOT_ALLOWED');

  try {
    const payload = await body<PrdHealthInput>(request);
    const workspaceId = payload.workspace_id || request.headers.get('x-workspace-id') || '';

    if (!workspaceId) {
      return errorWithCors(request, 'workspace_id is required', 400, 'MISSING_PARAMS');
    }

    const rl = await checkRateLimit(workspaceId, 'prd-health-score');
    if (!rl.allowed) {
      return errorWithCors(request, `Rate limit exceeded. Retry in ${Math.ceil(rl.retryAfterMs / 1000)}s`, 429, 'RATE_LIMITED');
    }

    const result = await runPrdHealth(workspaceId, {
      prd_content: payload.prd_content,
      product_context: payload.context || {},
      methodology_request: payload.methodology_request,
    });

    return jsonWithCors(request, {
      ...result.data,
      _meta: {
        provider_used: result.providerUsed,
        fallback_used: result.fallbackUsed,
        fallback_reason: result.fallbackReason,
        latency_ms: result.latencyMs,
        attempt_count: result.attemptCount,
        provider_chain: result.providerChain,
        failure_classification: result.failureClassification,
        repair_attempted: result.repairAttempted,
        prompt_version: result.promptVersion,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String(err.message) : 'PRD health scoring failed';
    return errorWithCors(request, message, 400, 'PRD_HEALTH_FAILED');
  }
});
