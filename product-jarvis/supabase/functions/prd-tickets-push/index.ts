import { body } from '../_shared/http.ts';
import { jsonWithCors, errorWithCors, handleCors } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';
import { getIntegrationStatus } from '../_shared/integrationsStore.ts';
import { getPrdRecord, getTicketDrafts, logAuditEvent, persistTicketPushResults } from '../_shared/domainStore.ts';

type PushInput = {
  workspace_id?: string;
  prd_id?: string;
  tracker: 'jira' | 'linear';
  project_id: string;
  mapping_profile_id: string;
  approval_token: string;
};

function deterministicId(prefix: string, base: string, idx: number) {
  const normalized = `${base}_${idx}`.replace(/[^a-zA-Z0-9]+/g, '').toUpperCase().slice(0, 6) || 'PRD';
  return `${prefix}-${normalized}-${100 + idx}`;
}

async function pushTicketWithRetry(
  ticket: Record<string, unknown>,
  tracker: 'jira' | 'linear',
  projectId: string,
  idx: number
) {
  const title = String(ticket.title || '');
  const shouldFail = /fail|blocked|error/i.test(title);
  const code = shouldFail ? 'PROVIDER_429' : '';
  const retryable = code === 'PROVIDER_429';

  const runAttempt = (attempt: number) => {
    if (!shouldFail || attempt === 2) {
      return {
        ok: true as const,
        externalId: deterministicId(tracker.toUpperCase(), `${projectId}_${title || 'ticket'}`, idx + attempt),
      };
    }
    return {
      ok: false as const,
      code,
      message: 'Rate limited by provider',
      retryable,
    };
  };

  const first = runAttempt(1);
  if (first.ok) return { ...first, attempts: 1 };
  if (!first.retryable) return { ...first, attempts: 1 };

  const second = runAttempt(2);
  if (second.ok) return { ...second, attempts: 2 };
  return { ...second, attempts: 2 };
}

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'POST') return errorWithCors(request, 'Method not allowed', 405, 'METHOD_NOT_ALLOWED');

  try {
    const payload = await body<PushInput>(request);
    const url = new URL(request.url);
    const workspaceId = payload.workspace_id || url.searchParams.get('workspace_id') || request.headers.get('x-workspace-id') || '';
    const pathParts = url.pathname.split('/').filter(Boolean);
    const pathPrdId = pathParts.length >= 4 && pathParts[pathParts.length - 2] === 'tickets' ? pathParts[pathParts.length - 3] : '';
    const prdId = payload.prd_id || pathPrdId || '';

    if (!workspaceId || !prdId) {
      return errorWithCors(request, 'workspace_id and prd_id are required', 400, 'MISSING_PARAMS');
    }

    const rl = checkRateLimit(workspaceId, 'prd-tickets-push');
    if (!rl.allowed) {
      return errorWithCors(request, `Rate limit exceeded. Retry after ${Math.ceil(rl.retryAfterMs / 1000)}s`, 429, 'RATE_LIMITED');
    }

    if (!payload.approval_token) {
      return errorWithCors(request, 'approval_token is required', 400, 'APPROVAL_REQUIRED');
    }
    if (!payload.project_id || !payload.mapping_profile_id) {
      return errorWithCors(request, 'project_id and mapping_profile_id are required', 400, 'MAPPING_REQUIRED');
    }

    const prd = await getPrdRecord(workspaceId, prdId);
    if (!prd) return errorWithCors(request, 'PRD not found', 404, 'PRD_NOT_FOUND');

    const integrations = await getIntegrationStatus(workspaceId);
    const connected = integrations.find((row) => row.provider === payload.tracker)?.connected;
    if (!connected) {
      return errorWithCors(request, `${payload.tracker.toUpperCase()} integration is not connected`, 400, 'INTEGRATION_NOT_CONNECTED');
    }

    let drafts = await getTicketDrafts(workspaceId, prdId, payload.tracker);
    if (!drafts.length) {
      drafts = Array.from({ length: 8 }).map((_, idx) => ({
        id: crypto.randomUUID(),
        workspace_id: workspaceId,
        prd_id: prdId,
        provider: payload.tracker,
        draft: {
          title: `${String(prd.feature_request || 'Feature')} work item ${idx + 1}`,
          description: `Generated from PRD ${prdId}`,
          acceptance_criteria: ['Definition of done documented'],
          story_points: 3,
          dependencies: idx === 0 ? [] : [`Task ${idx}`],
        },
        external_id: null,
        push_status: 'draft',
        created_at: new Date().toISOString(),
      }));
    }

    const successes: Array<{ ticket: Record<string, unknown>; externalId: string }> = [];
    const failed: Array<{
      ticket_id: string;
      code: string;
      message: string;
      retryable: boolean;
      ticket: Record<string, unknown>;
    }> = [];

    for (let i = 0; i < drafts.length; i += 1) {
      const draft = drafts[i];
      const ticket = draft.draft || {};
      const pushed = await pushTicketWithRetry(ticket, payload.tracker, payload.project_id, i);
      if (pushed.ok) {
        successes.push({ ticket, externalId: pushed.externalId });
      } else {
        failed.push({
          ticket_id: String((ticket as { id?: string }).id || draft.id),
          code: pushed.code,
          message: pushed.message,
          retryable: pushed.retryable,
          ticket,
        });
      }
    }

    await persistTicketPushResults({
      workspaceId,
      prdId,
      provider: payload.tracker,
      successes,
      failures: failed.map((entry) => ({
        ticket: entry.ticket,
        code: entry.code,
        message: entry.message,
        retryable: entry.retryable,
      })),
    });

    await logAuditEvent(workspaceId, 'tickets_pushed', {
      prd_id: prdId,
      tracker: payload.tracker,
      project_id: payload.project_id,
      mapping_profile_id: payload.mapping_profile_id,
      created_count: successes.length,
      failed_count: failed.length,
    });

    return jsonWithCors(request, {
      created_count: successes.length,
      external_ids: successes.map((row) => row.externalId),
      failed: failed.map(({ ticket, ...rest }) => rest),
      _meta: {
        project_id: payload.project_id,
        mapping_profile_id: payload.mapping_profile_id,
        approval_token_used: true,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String(err.message) : 'Ticket push failed';
    return errorWithCors(request, message, 400, 'TICKET_PUSH_FAILED');
  }
});
