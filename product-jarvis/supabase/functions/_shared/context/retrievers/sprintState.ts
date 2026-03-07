import { getSupabaseAdminClient } from '../../supabaseClient.ts';

export function getSprintState(context: Record<string, unknown>) {
  return String(context.sprint_status || '').trim();
}

export async function getSprintStateFromDb(workspaceId: string): Promise<string> {
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

    if (snapshot?.context?.sprint_status) {
      return String(snapshot.context.sprint_status);
    }

    const { data: tickets } = await client
      .from('tickets')
      .select('push_status, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!tickets?.length) return '';

    const pushed = tickets.filter((t) => t.push_status === 'pushed').length;
    const draft = tickets.filter((t) => t.push_status === 'draft').length;
    const failed = tickets.filter((t) => t.push_status === 'failed').length;

    return `Active tickets: ${pushed} pushed, ${draft} in draft, ${failed} failed`;
  } catch {
    return '';
  }
}
