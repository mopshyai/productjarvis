import { getSupabaseAdminClient } from './supabaseClient.ts';

const DEFAULT_CITATION = {
  id: 'no-source',
  source_type: 'system',
  source_id: 'no-source',
  source_url: '',
  excerpt: 'No source found',
  confidence: 0,
};

type PrdRecord = {
  id: string;
  workspace_id: string;
  feature_request: string;
  body: Record<string, unknown>;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
  citations: Array<Record<string, unknown>>;
};

type TicketRecord = {
  id: string;
  workspace_id: string;
  prd_id: string;
  provider: 'jira' | 'linear';
  draft: Record<string, unknown>;
  external_id: string | null;
  push_status: 'draft' | 'pushed' | 'failed';
  created_at: string;
};

type DecisionSource = {
  id: string;
  source_type: string;
  source_id: string;
  source_url: string;
  excerpt: string;
  confidence: number;
};

type DecisionResult = {
  id: string;
  statement: string;
  rationale: string;
  date: string;
  author: string;
  sources: DecisionSource[];
};

const memoryPrds = new Map<string, PrdRecord>();
const memoryTickets = new Map<string, TicketRecord[]>();
const memoryDecisions = new Map<string, DecisionResult[]>();
const memoryAudit: Array<{
  id: string;
  workspace_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}> = [];

function nowIso() {
  return new Date().toISOString();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeCitations(citations: unknown) {
  if (!Array.isArray(citations) || !citations.length) {
    return [DEFAULT_CITATION];
  }
  return citations.map((item, index) => {
    const row = typeof item === 'object' && item ? (item as Record<string, unknown>) : {};
    return {
      id: String(row.id || `cite_${index + 1}`),
      source_type: String(row.source_type || 'system'),
      source_id: String(row.source_id || 'unknown'),
      source_url: String(row.source_url || ''),
      excerpt: String(row.excerpt || 'No source found'),
      confidence: typeof row.confidence === 'number' ? row.confidence : 0.5,
    };
  });
}

function ticketKey(workspaceId: string, prdId: string, provider: string) {
  return `${workspaceId}:${prdId}:${provider}`;
}

export async function logAuditEvent(workspaceId: string, eventType: string, payload: Record<string, unknown>) {
  memoryAudit.unshift({
    id: crypto.randomUUID(),
    workspace_id: workspaceId,
    event_type: eventType,
    payload,
    created_at: nowIso(),
  });
  if (memoryAudit.length > 200) memoryAudit.pop();

  const client = getSupabaseAdminClient();
  if (client && isUuid(workspaceId)) {
    await client.from('audit_events').insert({
      workspace_id: workspaceId,
      event_type: eventType,
      payload,
    });
  }
}

export async function createPrdRecord(input: {
  workspaceId: string;
  featureRequest: string;
  body: Record<string, unknown>;
}) {
  const timestamp = nowIso();
  const record: PrdRecord = {
    id: crypto.randomUUID(),
    workspace_id: input.workspaceId,
    feature_request: input.featureRequest,
    body: input.body,
    status: 'draft',
    version: 1,
    created_at: timestamp,
    updated_at: timestamp,
    citations: normalizeCitations((input.body as { citations?: unknown }).citations),
  };

  const client = getSupabaseAdminClient();
  if (client && isUuid(input.workspaceId)) {
    const { data } = await client
      .from('prds')
      .insert({
        workspace_id: input.workspaceId,
        feature_request: input.featureRequest,
        body: input.body,
        status: 'draft',
        version: 1,
      })
      .select('id, feature_request, body, status, version, created_at, updated_at')
      .single();
    if (data) {
      const stored = {
        ...record,
        id: data.id,
        feature_request: data.feature_request,
        body: data.body,
        status: data.status,
        version: data.version,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
      memoryPrds.set(stored.id, stored);
      return stored;
    }
  }

  memoryPrds.set(record.id, record);
  return record;
}

export async function getPrdRecord(workspaceId: string, prdId: string) {
  const local = memoryPrds.get(prdId);
  if (local && local.workspace_id === workspaceId) return local;

  const client = getSupabaseAdminClient();
  if (client && isUuid(workspaceId) && isUuid(prdId)) {
    const { data } = await client
      .from('prds')
      .select('id, workspace_id, feature_request, body, status, version, created_at, updated_at')
      .eq('workspace_id', workspaceId)
      .eq('id', prdId)
      .maybeSingle();
    if (data) {
      const stored: PrdRecord = {
        ...data,
        citations: normalizeCitations((data.body as { citations?: unknown })?.citations),
      };
      memoryPrds.set(prdId, stored);
      return stored;
    }
  }

  return null;
}

export async function updatePrdRecord(input: {
  workspaceId: string;
  prdId: string;
  version: number;
  body: Record<string, unknown>;
}) {
  const current = await getPrdRecord(input.workspaceId, input.prdId);
  if (!current) {
    throw new Error('PRD_NOT_FOUND');
  }
  if (current.version !== input.version) {
    throw new Error('VERSION_CONFLICT');
  }

  const next: PrdRecord = {
    ...current,
    body: input.body,
    status: 'approved',
    version: current.version + 1,
    updated_at: nowIso(),
    citations: normalizeCitations((input.body as { citations?: unknown }).citations),
  };

  const client = getSupabaseAdminClient();
  if (client && isUuid(input.workspaceId) && isUuid(input.prdId)) {
    const { data } = await client
      .from('prds')
      .update({
        body: input.body,
        status: 'approved',
        version: next.version,
        updated_at: next.updated_at,
      })
      .eq('workspace_id', input.workspaceId)
      .eq('id', input.prdId)
      .eq('version', input.version)
      .select('id, workspace_id, feature_request, body, status, version, created_at, updated_at')
      .maybeSingle();

    if (!data) {
      throw new Error('VERSION_CONFLICT');
    }
    next.feature_request = data.feature_request;
    next.created_at = data.created_at;
    next.updated_at = data.updated_at;
  }

  memoryPrds.set(next.id, next);
  return next;
}

export async function saveTicketDrafts(input: {
  workspaceId: string;
  prdId: string;
  provider: 'jira' | 'linear';
  tickets: Array<Record<string, unknown>>;
}) {
  const key = ticketKey(input.workspaceId, input.prdId, input.provider);
  const now = nowIso();
  const records: TicketRecord[] = input.tickets.map((ticket) => ({
    id: crypto.randomUUID(),
    workspace_id: input.workspaceId,
    prd_id: input.prdId,
    provider: input.provider,
    draft: ticket,
    external_id: null,
    push_status: 'draft',
    created_at: now,
  }));

  memoryTickets.set(key, records);

  const client = getSupabaseAdminClient();
  if (client && isUuid(input.workspaceId) && isUuid(input.prdId)) {
    await client.from('tickets').delete().eq('workspace_id', input.workspaceId).eq('prd_id', input.prdId).eq('provider', input.provider);
    await client.from('tickets').insert(
      records.map((row) => ({
        workspace_id: row.workspace_id,
        prd_id: row.prd_id,
        provider: row.provider,
        draft: row.draft,
        external_id: row.external_id,
        push_status: row.push_status,
      }))
    );
  }

  return records;
}

export async function getTicketDrafts(workspaceId: string, prdId: string, provider: 'jira' | 'linear') {
  const key = ticketKey(workspaceId, prdId, provider);
  const local = memoryTickets.get(key);
  if (local?.length) return local;

  const client = getSupabaseAdminClient();
  if (client && isUuid(workspaceId) && isUuid(prdId)) {
    const { data } = await client
      .from('tickets')
      .select('id, workspace_id, prd_id, provider, draft, external_id, push_status, created_at')
      .eq('workspace_id', workspaceId)
      .eq('prd_id', prdId)
      .eq('provider', provider)
      .eq('push_status', 'draft')
      .order('created_at', { ascending: true });
    if (data?.length) {
      const normalized = data as TicketRecord[];
      memoryTickets.set(key, normalized);
      return normalized;
    }
  }

  return [];
}

export async function persistTicketPushResults(input: {
  workspaceId: string;
  prdId: string;
  provider: 'jira' | 'linear';
  successes: Array<{ ticket: Record<string, unknown>; externalId: string }>;
  failures: Array<{ ticket: Record<string, unknown>; code: string; message: string; retryable: boolean }>;
}) {
  const key = ticketKey(input.workspaceId, input.prdId, input.provider);
  const pushedRows: TicketRecord[] = [
    ...input.successes.map((item) => ({
      id: crypto.randomUUID(),
      workspace_id: input.workspaceId,
      prd_id: input.prdId,
      provider: input.provider,
      draft: item.ticket,
      external_id: item.externalId,
      push_status: 'pushed' as const,
      created_at: nowIso(),
    })),
    ...input.failures.map((item) => ({
      id: crypto.randomUUID(),
      workspace_id: input.workspaceId,
      prd_id: input.prdId,
      provider: input.provider,
      draft: { ...item.ticket, push_error: item.message, push_error_code: item.code, retryable: item.retryable },
      external_id: null,
      push_status: 'failed' as const,
      created_at: nowIso(),
    })),
  ];

  memoryTickets.set(key, pushedRows);

  const client = getSupabaseAdminClient();
  if (client && isUuid(input.workspaceId) && isUuid(input.prdId)) {
    await client.from('tickets').insert(
      pushedRows.map((row) => ({
        workspace_id: row.workspace_id,
        prd_id: row.prd_id,
        provider: row.provider,
        draft: row.draft,
        external_id: row.external_id,
        push_status: row.push_status,
      }))
    );
  }
}

export async function searchDecisionRecords(workspaceId: string, query: string): Promise<DecisionResult[]> {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const local = memoryDecisions.get(workspaceId) || [];
  const localMatches = local.filter((item) =>
    `${item.statement} ${item.rationale} ${item.author}`.toLowerCase().includes(normalizedQuery)
  );

  const client = getSupabaseAdminClient();
  if (!(client && isUuid(workspaceId))) {
    return localMatches;
  }

  const pattern = `%${normalizedQuery}%`;
  const { data: lexicalRows } = await client
    .from('decisions')
    .select('id, statement, rationale, decision_date, author')
    .eq('workspace_id', workspaceId)
    .or(`statement.ilike.${pattern},rationale.ilike.${pattern},author.ilike.${pattern}`)
    .limit(25);

  const { data: semanticSourceRows } = await client
    .from('decision_sources')
    .select('decision_id')
    .eq('workspace_id', workspaceId)
    .ilike('excerpt', pattern)
    .limit(25);

  const lexicalIds = new Set((lexicalRows || []).map((row) => row.id));
  const semanticIds = new Set((semanticSourceRows || []).map((row) => row.decision_id));
  const mergedIds = Array.from(new Set([...lexicalIds, ...semanticIds]));
  if (!mergedIds.length) return localMatches;

  const { data: decisionRows } = await client
    .from('decisions')
    .select('id, statement, rationale, decision_date, author')
    .eq('workspace_id', workspaceId)
    .in('id', mergedIds)
    .limit(25);
  if (!decisionRows?.length) return localMatches;

  const decisionIds = decisionRows.map((row) => row.id);
  const { data: sourceRows } = await client
    .from('decision_sources')
    .select('id, decision_id, source_type, source_id, source_url, excerpt, confidence')
    .in('decision_id', decisionIds);
  const sourcesByDecision = new Map<string, DecisionSource[]>();
  (sourceRows || []).forEach((row) => {
    const list = sourcesByDecision.get(row.decision_id) || [];
    list.push({
      id: row.id,
      source_type: row.source_type || 'system',
      source_id: row.source_id || 'unknown',
      source_url: row.source_url || '',
      excerpt: row.excerpt || 'No source found',
      confidence: typeof row.confidence === 'number' ? row.confidence : 0,
    });
    sourcesByDecision.set(row.decision_id, list);
  });

  const merged = decisionRows.map((row) => ({
    id: row.id,
    statement: row.statement,
    rationale: row.rationale,
    date: row.decision_date || nowIso().slice(0, 10),
    author: row.author || 'Unknown',
    sources: sourcesByDecision.get(row.id) || [DEFAULT_CITATION],
  }));

  memoryDecisions.set(workspaceId, merged);
  return merged;
}

export function getRecentAuditEvents(limit = 50) {
  return memoryAudit.slice(0, limit);
}
