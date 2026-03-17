import { body } from '../_shared/http.ts';
import { handleCors, jsonWithCors, errorWithCors } from '../_shared/cors.ts';
import { runStakeholderUpdate } from '../_shared/pipelines/stakeholderUpdate.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';

type StakeholderInput = {
  workspace_id: string;
  feature_name: string;
  status: string;
  total_tickets: number;
  closed_tickets: number;
  open_tickets: number;
  blocked_tickets: number;
  eta: string;
  metrics: string[];
  decisions: string[];
  risks: string[];
  audience: string;
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
    const payload = await body<StakeholderInput>(request);
    const workspaceId = payload.workspace_id || request.headers.get('x-workspace-id') || '';

    if (!workspaceId) {
      return errorWithCors(request, 'workspace_id is required', 400, 'MISSING_PARAMS');
    }

    const rl = await checkRateLimit(workspaceId, 'stakeholder-update');
    if (!rl.allowed) {
      return errorWithCors(request, `Rate limit exceeded. Retry in ${Math.ceil(rl.retryAfterMs / 1000)}s`, 429, 'RATE_LIMITED');
    }

    const result = await runStakeholderUpdate(workspaceId, {
      ...payload,
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
    const message = err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String(err.message) : 'Stakeholder update failed';
    return errorWithCors(request, message, 400, 'STAKEHOLDER_UPDATE_FAILED');
  }
});
