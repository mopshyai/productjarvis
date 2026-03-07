import { getSupabaseAdminClient } from '../../supabaseClient.ts';

export function getMetricDeltas(context: Record<string, unknown>) {
  const metrics = Array.isArray(context.metrics) ? context.metrics : [];
  return metrics.slice(0, 20).join('\n');
}

export async function getMetricDeltasFromDb(workspaceId: string): Promise<string> {
  const client = getSupabaseAdminClient();
  if (!client) return '';

  try {
    const { data: snapshot } = await client
      .from('product_context_snapshots')
      .select('context')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!snapshot?.context) return '';

    const metrics = Array.isArray(snapshot.context.metrics) ? snapshot.context.metrics : [];
    const okrs = Array.isArray(snapshot.context.okrs) ? snapshot.context.okrs : [];

    const parts: string[] = [];
    if (metrics.length) parts.push('Metrics:\n' + metrics.slice(0, 10).join('\n'));
    if (okrs.length) parts.push('OKRs:\n' + okrs.slice(0, 5).join('\n'));

    return parts.join('\n\n');
  } catch {
    return '';
  }
}
