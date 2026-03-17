import { handleCors, jsonWithCors, errorWithCors } from '../_shared/cors.ts';
import { body } from '../_shared/http.ts';
import { runCommandRouter } from '../_shared/pipelines/commandRouter.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';

type CommandExecuteInput = {
  workspace_id: string;
  user_input: string;
  mode?: string;
  current_page?: string;
  current_feature?: string;
  current_prd_title?: string;
  time_of_day?: string;
  product_context?: Record<string, unknown>;
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
    const payload = await body<CommandExecuteInput>(request);
    const workspaceId = payload.workspace_id || request.headers.get('x-workspace-id') || '';

    if (!workspaceId) {
      return errorWithCors(request, 'workspace_id is required', 400, 'MISSING_PARAMS');
    }

    const rateCheck = await checkRateLimit(workspaceId, 'command-execute');
    if (!rateCheck.allowed) {
      return errorWithCors(request, `Rate limit exceeded. Retry in ${Math.ceil(rateCheck.retryAfterMs / 1000)}s`, 429, 'RATE_LIMITED');
    }

    const result = await runCommandRouter(workspaceId, {
      ...payload,
      time_of_day: payload.time_of_day || new Date().toISOString(),
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
    const message = err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String(err.message) : 'Command execution failed';
    return errorWithCors(request, message, 400, 'COMMAND_EXECUTION_FAILED');
  }
});
