import { jsonWithCors, errorWithCors, handleCors } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';
import { runDailyDigest } from '../_shared/pipelines/dailyDigest.ts';

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'GET') return errorWithCors(request, 'Method not allowed', 405, 'METHOD_NOT_ALLOWED');

  try {
    const workspaceId = request.headers.get('x-workspace-id') || 'ws_default';

    const rl = await checkRateLimit(workspaceId, 'digest-today');
    if (!rl.allowed) {
      return errorWithCors(request, `Rate limit exceeded. Retry after ${Math.ceil(rl.retryAfterMs / 1000)}s`, 429, 'RATE_LIMITED');
    }

    const result = await runDailyDigest(workspaceId, {
      product_context: {
        sprint_status: 'active',
      },
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
    const message = err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String(err.message) : 'Daily digest failed';
    return errorWithCors(request, message, 400, 'DAILY_DIGEST_FAILED');
  }
});
