import { body } from '../_shared/http.ts';
import { jsonWithCors, errorWithCors, handleCors } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';
import { runDecisionDetection } from '../_shared/pipelines/decisionDetection.ts';

type DetectInput = {
  workspace_id: string;
  source_type: string;
  participants: string[];
  datetime: string;
  thread_or_transcript: string;
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
    const payload = await body<DetectInput>(request);

    const rl = checkRateLimit(payload.workspace_id, 'decisions-detect');
    if (!rl.allowed) {
      return errorWithCors(request, `Rate limit exceeded. Retry after ${Math.ceil(rl.retryAfterMs / 1000)}s`, 429, 'RATE_LIMITED');
    }

    const result = await runDecisionDetection(payload.workspace_id, {
      source_type: payload.source_type,
      participants: payload.participants,
      datetime: payload.datetime,
      thread_or_transcript: payload.thread_or_transcript,
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
    const message = err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String(err.message) : 'Decision detection failed';
    return errorWithCors(request, message, 400, 'DECISION_DETECTION_FAILED');
  }
});
