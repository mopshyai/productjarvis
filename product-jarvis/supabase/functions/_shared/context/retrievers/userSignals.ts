import { getSupabaseAdminClient } from '../../supabaseClient.ts';

export function getUserSignals(context: Record<string, unknown>) {
  const signals = Array.isArray(context.user_signals) ? context.user_signals : [];
  return signals.slice(0, 15).join('\n');
}

export async function getUserSignalsFromDb(workspaceId: string): Promise<string> {
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

    const signals = Array.isArray(snapshot.context.user_signals) ? snapshot.context.user_signals : [];
    return signals.slice(0, 15).join('\n');
  } catch {
    return '';
  }
}
