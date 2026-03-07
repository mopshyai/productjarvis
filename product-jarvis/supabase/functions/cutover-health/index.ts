import { jsonWithCors, errorWithCors, handleCors } from '../_shared/cors.ts';
import { getIntegrationStatus } from '../_shared/integrationsStore.ts';
import { getRecentAnalyticsEvents, getRecentContextLogs, getRecentPromptRuns } from '../_shared/storage.ts';
import { getSupabaseAdminClient } from '../_shared/supabaseClient.ts';

function rate(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Number((numerator / denominator).toFixed(4));
}

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'GET') return errorWithCors(request, 'Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get('workspace_id') || request.headers.get('x-workspace-id') || 'ws_1';

  const promptRuns = getRecentPromptRuns(200);
  const contextLogs = getRecentContextLogs(200);
  const analytics = getRecentAnalyticsEvents(500);
  const integrations = await getIntegrationStatus(workspaceId);

  const failedPromptRuns = promptRuns.filter((row) => row.validation_status === 'fail').length;
  const fallbackRuns = promptRuns.filter((row) => row.fallback_used).length;
  const avgLatency =
    promptRuns.length > 0 ? Math.round(promptRuns.reduce((sum, row) => sum + row.latency_ms, 0) / promptRuns.length) : 0;
  const p95 = (() => {
    if (!promptRuns.length) return 0;
    const values = promptRuns.map((row) => row.latency_ms).sort((a, b) => a - b);
    const idx = Math.min(values.length - 1, Math.ceil(values.length * 0.95) - 1);
    return values[idx];
  })();

  const avgContextTokens =
    contextLogs.length > 0
      ? Math.round(contextLogs.reduce((sum, row) => sum + row.token_count, 0) / contextLogs.length)
      : 0;
  const eventsLastHour = analytics.filter((row) => Date.now() - Date.parse(row.created_at) <= 1000 * 60 * 60).length;

  const client = getSupabaseAdminClient();
  let authFailuresLastHour = 0;
  let ticketPushFailureRate = 0;
  if (client && /^[0-9a-f-]{36}$/i.test(workspaceId)) {
    const oneHourAgo = new Date(Date.now() - 1000 * 60 * 60).toISOString();
    const { count } = await client
      .from('auth_events')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'failed')
      .gte('created_at', oneHourAgo);
    authFailuresLastHour = count || 0;

    const { data: ticketRows } = await client
      .from('tickets')
      .select('push_status')
      .eq('workspace_id', workspaceId)
      .in('push_status', ['pushed', 'failed'])
      .gte('created_at', oneHourAgo)
      .limit(1000);
    const totalPushes = (ticketRows || []).length;
    const failedPushes = (ticketRows || []).filter((row) => row.push_status === 'failed').length;
    ticketPushFailureRate = rate(failedPushes, totalPushes);
  }

  const connectedIntegrations = integrations.filter((entry) => entry.connected).length;
  const gateChecks = {
    prompt_5xx_rate_below_2pct: rate(failedPromptRuns, promptRuns.length) < 0.02,
    fallback_rate_below_15pct: rate(fallbackRuns, promptRuns.length) < 0.15,
    p95_latency_below_30s: p95 < 30000,
    ticket_push_failure_rate_below_10pct: ticketPushFailureRate < 0.1,
    auth_callback_failures_last_hour_below_5: authFailuresLastHour < 5,
  };

  return jsonWithCors(request, {
    generated_at: new Date().toISOString(),
    workspace_id: workspaceId,
    summary: {
      prompt_runs: promptRuns.length,
      failed_prompt_runs: failedPromptRuns,
      fallback_runs: fallbackRuns,
      avg_latency_ms: avgLatency,
      p95_latency_ms: p95,
      avg_context_tokens: avgContextTokens,
      events_last_hour: eventsLastHour,
      auth_failures_last_hour: authFailuresLastHour,
      ticket_push_failure_rate: ticketPushFailureRate,
      connected_integrations: connectedIntegrations,
    },
    integrations,
    gate_checks: gateChecks,
    rollback_recommended: Object.values(gateChecks).some((value) => !value),
  });
});
