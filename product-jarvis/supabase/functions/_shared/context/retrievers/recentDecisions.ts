import { getSupabaseAdminClient } from '../../supabaseClient.ts';

export function getRecentDecisions(context: Record<string, unknown>) {
  const decisions = Array.isArray(context.decisions) ? context.decisions : [];
  return decisions.slice(0, 15).join('\n');
}

export async function getRecentDecisionsFromDb(workspaceId: string, limit = 15): Promise<string> {
  const client = getSupabaseAdminClient();
  if (!client) return '';

  try {
    const { data } = await client
      .from('decisions')
      .select('statement, rationale, decision_date, author')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!data?.length) return '';

    return data
      .map((d) => `- [${d.decision_date || 'undated'}] ${d.statement} (by ${d.author || 'unknown'}): ${d.rationale}`)
      .join('\n');
  } catch {
    return '';
  }
}
