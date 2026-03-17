import { body } from '../_shared/http.ts';
import { jsonWithCors, errorWithCors, handleCors } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';
import { getIntegrationStatus } from '../_shared/integrationsStore.ts';
import { getPrdRecord, getTicketDrafts, logAuditEvent, persistTicketPushResults } from '../_shared/domainStore.ts';
import { decryptToken } from '../_shared/tokenEncryption.ts';
import { getSupabaseAdminClient } from '../_shared/supabaseClient.ts';

type PushInput = {
  workspace_id?: string;
  prd_id?: string;
  tracker: 'jira' | 'linear';
  project_id: string;
  mapping_profile_id: string;
  approval_token: string;
};

type StoredTokens = {
  access_token: string;
  refresh_token?: string;
};

async function getAccessToken(workspaceId: string, provider: 'jira' | 'linear'): Promise<string> {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error('Database not available');

  const { data } = await client
    .from('integrations')
    .select('encrypted_tokens')
    .eq('workspace_id', workspaceId)
    .eq('provider', provider)
    .eq('status', 'connected')
    .single();

  if (!data?.encrypted_tokens) throw new Error(`No tokens found for ${provider}`);

  const decrypted = await decryptToken(data.encrypted_tokens);
  const tokens: StoredTokens = JSON.parse(decrypted);
  return tokens.access_token;
}

async function pushToJira(
  ticket: Record<string, unknown>,
  projectId: string,
  accessToken: string
): Promise<{ ok: true; externalId: string } | { ok: false; code: string; message: string; retryable: boolean }> {
  // First, get the cloud ID for this Jira instance
  const sitesRes = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });

  if (!sitesRes.ok) {
    return { ok: false, code: 'JIRA_SITES_FAILED', message: 'Failed to fetch Jira sites', retryable: false };
  }

  const sites = await sitesRes.json();
  if (!sites.length) {
    return { ok: false, code: 'JIRA_NO_SITES', message: 'No Jira sites accessible', retryable: false };
  }

  const cloudId = sites[0].id;

  const res = await fetch(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        project: { key: projectId },
        summary: String(ticket.title || 'Untitled'),
        description: {
          type: 'doc',
          version: 1,
          content: [{ type: 'paragraph', content: [{ type: 'text', text: String(ticket.description || '') }] }],
        },
        issuetype: { name: 'Story' },
        ...(ticket.story_points != null ? { story_points: Number(ticket.story_points) } : {}),
      },
    }),
  });

  if (res.status === 429) {
    return { ok: false, code: 'PROVIDER_429', message: 'Rate limited by Jira', retryable: true };
  }

  if (!res.ok) {
    const err = await res.text();
    return { ok: false, code: 'JIRA_CREATE_FAILED', message: `Jira issue creation failed: ${err}`, retryable: false };
  }

  const created = await res.json();
  return { ok: true, externalId: created.key };
}

async function pushToLinear(
  ticket: Record<string, unknown>,
  teamId: string,
  accessToken: string
): Promise<{ ok: true; externalId: string } | { ok: false; code: string; message: string; retryable: boolean }> {
  const mutation = `
    mutation CreateIssue($title: String!, $description: String, $teamId: String!, $estimate: Int) {
      issueCreate(input: { title: $title, description: $description, teamId: $teamId, estimate: $estimate }) {
        success
        issue { id identifier url }
      }
    }
  `;

  const res = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: mutation,
      variables: {
        title: String(ticket.title || 'Untitled'),
        description: String(ticket.description || ''),
        teamId,
        estimate: ticket.story_points != null ? Number(ticket.story_points) : undefined,
      },
    }),
  });

  if (res.status === 429) {
    return { ok: false, code: 'PROVIDER_429', message: 'Rate limited by Linear', retryable: true };
  }

  if (!res.ok) {
    const err = await res.text();
    return { ok: false, code: 'LINEAR_CREATE_FAILED', message: `Linear issue creation failed: ${err}`, retryable: false };
  }

  const result = await res.json();
  if (!result?.data?.issueCreate?.success) {
    const gqlErrors = result?.errors?.map((e: { message: string }) => e.message).join(', ') || 'Unknown error';
    return { ok: false, code: 'LINEAR_CREATE_FAILED', message: gqlErrors, retryable: false };
  }

  return { ok: true, externalId: result.data.issueCreate.issue.identifier };
}

async function pushTicket(
  ticket: Record<string, unknown>,
  tracker: 'jira' | 'linear',
  projectId: string,
  accessToken: string
) {
  if (tracker === 'jira') return pushToJira(ticket, projectId, accessToken);
  return pushToLinear(ticket, projectId, accessToken);
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

    const rl = await checkRateLimit(workspaceId, 'prd-tickets-push');
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

    const accessToken = await getAccessToken(workspaceId, payload.tracker);

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
      const pushed = await pushTicket(ticket, payload.tracker, payload.project_id, accessToken);

      if (pushed.ok) {
        successes.push({ ticket, externalId: pushed.externalId });
      } else {
        // Retry once on rate limit
        if (pushed.retryable) {
          await new Promise((r) => setTimeout(r, 1000));
          const retry = await pushTicket(ticket, payload.tracker, payload.project_id, accessToken);
          if (retry.ok) {
            successes.push({ ticket, externalId: retry.externalId });
            continue;
          }
        }
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
