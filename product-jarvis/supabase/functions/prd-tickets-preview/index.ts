import { handleCors, jsonWithCors, errorWithCors } from '../_shared/cors.ts';
import { body } from '../_shared/http.ts';
import { logAuditEvent, saveTicketDrafts } from '../_shared/domainStore.ts';
import { runTicketFactory } from '../_shared/pipelines/ticketFactory.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';

type PreviewInput = {
  workspace_id: string;
  prd_id?: string;
  tracker: 'jira' | 'linear';
  prd_content: Record<string, unknown>;
  velocity_data?: unknown;
  backlog_summary?: unknown;
  sprint_capacity?: unknown;
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
    const payload = await body<PreviewInput>(request);
    const workspaceId = payload.workspace_id || request.headers.get('x-workspace-id') || '';
    const pathParts = new URL(request.url).pathname.split('/').filter(Boolean);
    const pathPrdId = pathParts.length >= 4 && pathParts[pathParts.length - 2] === 'tickets' ? pathParts[pathParts.length - 3] : '';
    const prdId = payload.prd_id || pathPrdId || '';

    if (!workspaceId) {
      return errorWithCors(request, 'workspace_id is required', 400, 'MISSING_PARAMS');
    }

    const rateCheck = await checkRateLimit(workspaceId, 'prd-tickets-preview');
    if (!rateCheck.allowed) {
      return errorWithCors(request, `Rate limit exceeded. Retry in ${Math.ceil(rateCheck.retryAfterMs / 1000)}s`, 429, 'RATE_LIMITED');
    }

    const result = await runTicketFactory(workspaceId, {
      prd_content: payload.prd_content,
      tracker: payload.tracker,
      velocity_data: payload.velocity_data || [],
      backlog_summary: payload.backlog_summary || [],
      sprint_capacity: payload.sprint_capacity || {},
      product_context: payload.prd_content,
      methodology_request: payload.methodology_request,
    });

    if (prdId && Array.isArray((result.data as { tickets?: unknown }).tickets)) {
      await saveTicketDrafts({
        workspaceId,
        prdId,
        provider: payload.tracker,
        tickets: (result.data as { tickets: Array<Record<string, unknown>> }).tickets,
      });
      await logAuditEvent(workspaceId, 'ticket_preview_generated', {
        prd_id: prdId,
        tracker: payload.tracker,
        count: ((result.data as { tickets?: unknown[] }).tickets || []).length,
      });
    }

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
    const message = err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String(err.message) : 'Ticket preview failed';
    return errorWithCors(request, message, 400, 'TICKET_PREVIEW_FAILED');
  }
});
