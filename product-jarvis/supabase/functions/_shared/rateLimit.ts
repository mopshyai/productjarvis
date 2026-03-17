import { getSupabaseAdminClient } from './supabaseClient.ts';

const LIMITS: Record<string, { max: number; windowMs: number }> = {
  'prd-generate': { max: 10, windowMs: 3600_000 },
  'prd-update': { max: 30, windowMs: 3600_000 },
  'command-execute': { max: 60, windowMs: 3600_000 },
  'prd-tickets-preview': { max: 20, windowMs: 3600_000 },
  'prd-tickets-push': { max: 10, windowMs: 3600_000 },
  'decisions-detect': { max: 20, windowMs: 3600_000 },
  'decisions-search': { max: 60, windowMs: 3600_000 },
  'digest-today': { max: 30, windowMs: 3600_000 },
  'prd-health-score': { max: 30, windowMs: 3600_000 },
  'stakeholder-update': { max: 20, windowMs: 3600_000 },
  'evidence-ingest': { max: 30, windowMs: 3600_000 },
  'opportunities-synthesize': { max: 20, windowMs: 3600_000 },
  default: { max: 120, windowMs: 3600_000 },
};

export async function checkRateLimit(workspaceId: string, endpoint: string): Promise<{ allowed: boolean; remaining: number; retryAfterMs: number }> {
  const limit = LIMITS[endpoint] || LIMITS.default;

  const client = getSupabaseAdminClient();
  if (!client || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(workspaceId)) {
    return { allowed: true, remaining: limit.max, retryAfterMs: 0 };
  }

  try {
    const { data } = await client.rpc('check_and_increment_rate_limit', {
      p_workspace_id: workspaceId,
      p_endpoint: endpoint,
      p_max_requests: limit.max,
      p_window_ms: limit.windowMs,
    });

    if (data && data.length > 0) {
      const row = data[0];
      return {
        allowed: row.allowed,
        remaining: row.remaining,
        retryAfterMs: row.retry_after_ms,
      };
    }

    return { allowed: true, remaining: limit.max, retryAfterMs: 0 };
  } catch {
    return { allowed: true, remaining: limit.max, retryAfterMs: 0 };
  }
}

export async function checkUsageQuota(workspaceId: string): Promise<{ allowed: boolean; used: number; limit: number; message: string }> {
  const periodLabel = new Date().toISOString().slice(0, 7);

  const client = getSupabaseAdminClient();
  if (!client) {
    return { allowed: true, used: 0, limit: 3, message: 'No DB — allowing request' };
  }

  try {
    const { data } = await client
      .from('usage_counters')
      .select('prd_limit, prd_generated, period_label')
      .eq('workspace_id', workspaceId)
      .eq('period_label', periodLabel)
      .maybeSingle();

    if (!data) {
      await client.from('usage_counters').insert({
        workspace_id: workspaceId,
        period_label: periodLabel,
        prd_limit: 3,
        prd_generated: 0,
      });
      return { allowed: true, used: 0, limit: 3, message: 'New period initialized' };
    }

    if (data.prd_generated >= data.prd_limit) {
      return {
        allowed: false,
        used: data.prd_generated,
        limit: data.prd_limit,
        message: `Monthly PRD quota reached (${data.prd_generated}/${data.prd_limit}). Upgrade for more.`,
      };
    }

    return { allowed: true, used: data.prd_generated, limit: data.prd_limit, message: 'OK' };
  } catch {
    return { allowed: true, used: 0, limit: 3, message: 'Quota check failed — allowing request' };
  }
}

export async function incrementUsage(workspaceId: string): Promise<void> {
  const periodLabel = new Date().toISOString().slice(0, 7);

  const client = getSupabaseAdminClient();
  if (!client) return;

  try {
    await client.rpc('increment_prd_usage', {
      p_workspace_id: workspaceId,
      p_period_label: periodLabel,
    });
  } catch {
    // Fallback: direct update if RPC doesn't exist
    const { data } = await client
      .from('usage_counters')
      .select('prd_generated')
      .eq('workspace_id', workspaceId)
      .eq('period_label', periodLabel)
      .maybeSingle();

    if (data) {
      await client
        .from('usage_counters')
        .update({ prd_generated: (data.prd_generated || 0) + 1 })
        .eq('workspace_id', workspaceId)
        .eq('period_label', periodLabel);
    }
  }
}
