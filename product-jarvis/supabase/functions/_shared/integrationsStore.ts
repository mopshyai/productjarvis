import { getSupabaseAdminClient } from './supabaseClient.ts';

type IntegrationProvider = 'jira' | 'linear' | 'notion';

type IntegrationRecord = {
  workspace_id: string;
  provider: IntegrationProvider;
  status: 'disconnected' | 'connected';
  encrypted_tokens: string | null;
  refresh_at: string | null;
};

const memory = new Map<string, IntegrationRecord>();

function key(workspaceId: string, provider: IntegrationProvider) {
  return `${workspaceId}:${provider}`;
}

export async function getIntegrationStatus(workspaceId: string) {
  const client = getSupabaseAdminClient();
  const providers: IntegrationProvider[] = ['jira', 'linear', 'notion'];

  if (client) {
    const { data } = await client
      .from('integrations')
      .select('provider,status,refresh_at')
      .eq('workspace_id', workspaceId);

    const byProvider = new Map((data || []).map((row) => [row.provider, row]));
    return providers.map((provider) => ({
      provider,
      status: byProvider.get(provider)?.status || 'disconnected',
      connected: byProvider.get(provider)?.status === 'connected',
      refresh_at: byProvider.get(provider)?.refresh_at || null,
    }));
  }

  return providers.map((provider) => {
    const row = memory.get(key(workspaceId, provider));
    return {
      provider,
      status: row?.status || 'disconnected',
      connected: row?.status === 'connected',
      refresh_at: row?.refresh_at || null,
    };
  });
}

export async function upsertIntegration(record: IntegrationRecord) {
  memory.set(key(record.workspace_id, record.provider), record);

  const client = getSupabaseAdminClient();
  if (client) {
    await client.from('integrations').upsert(record, {
      onConflict: 'workspace_id,provider',
    });
  }

  return record;
}
