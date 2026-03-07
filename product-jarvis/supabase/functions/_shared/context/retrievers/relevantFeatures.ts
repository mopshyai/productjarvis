import { getSupabaseAdminClient } from '../../supabaseClient.ts';

export function getRelevantFeatures(context: Record<string, unknown>) {
  const features = Array.isArray(context.features_summary) ? context.features_summary : [];
  return features.slice(0, 5).join('\n');
}

export async function getRelevantFeaturesFromDb(workspaceId: string, limit = 10): Promise<string> {
  const client = getSupabaseAdminClient();
  if (!client) return '';

  try {
    const { data } = await client
      .from('prds')
      .select('feature_request, status, version, updated_at')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (!data?.length) return '';

    return data
      .map((p) => `- [${p.status}] ${p.feature_request} (v${p.version}, updated ${p.updated_at})`)
      .join('\n');
  } catch {
    return '';
  }
}
