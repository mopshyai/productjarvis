import { handleCors, jsonWithCors, errorWithCors } from '../_shared/cors.ts';
import { body } from '../_shared/http.ts';
import { createPrdRecord, logAuditEvent } from '../_shared/domainStore.ts';
import { runPrdGeneration } from '../_shared/pipelines/prdGeneration.ts';
import { checkRateLimit, checkUsageQuota, incrementUsage } from '../_shared/rateLimit.ts';

type GenerateInput = {
  workspace_id: string;
  feature_request: string;
  product_context: Record<string, unknown>;
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
    const payload = await body<GenerateInput>(request);
    const workspaceId = payload.workspace_id || request.headers.get('x-workspace-id') || '';

    if (!workspaceId) {
      return errorWithCors(request, 'workspace_id is required', 400, 'MISSING_PARAMS');
    }
    if (!payload.feature_request?.trim()) {
      return errorWithCors(request, 'feature_request is required', 400, 'MISSING_PARAMS');
    }

    // Rate limiting
    const rateCheck = await checkRateLimit(workspaceId, 'prd-generate');
    if (!rateCheck.allowed) {
      return errorWithCors(request, `Rate limit exceeded. Retry in ${Math.ceil(rateCheck.retryAfterMs / 1000)}s`, 429, 'RATE_LIMITED');
    }

    // Usage quota
    const usageCheck = await checkUsageQuota(workspaceId);
    if (!usageCheck.allowed) {
      return errorWithCors(request, usageCheck.message, 402, 'QUOTA_EXCEEDED');
    }

    const result = await runPrdGeneration(workspaceId, {
      feature_request: payload.feature_request,
      user_input: payload.feature_request,
      product_context: payload.product_context,
      methodology_request: payload.methodology_request,
    });

    const stored = await createPrdRecord({
      workspaceId,
      featureRequest: payload.feature_request,
      body: result.data,
    });

    await incrementUsage(workspaceId);
    await logAuditEvent(workspaceId, 'prd_generated', {
      prd_id: stored.id,
      feature_request: payload.feature_request,
      provider_used: result.providerUsed,
      latency_ms: result.latencyMs,
    });

    return jsonWithCors(request, {
      id: stored.id,
      feature_request: stored.feature_request,
      body: stored.body,
      status: stored.status,
      version: stored.version,
      created_at: stored.created_at,
      updated_at: stored.updated_at,
      citations: stored.citations,
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
        usage: { used: usageCheck.used + 1, limit: usageCheck.limit },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String(err.message) : 'PRD generation failed';
    return errorWithCors(request, message, 400, 'PRD_GENERATION_FAILED');
  }
});
