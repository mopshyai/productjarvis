import { jsonWithCors, errorWithCors, handleCors } from '../_shared/cors.ts';
import { getRecentContextLogs, getRecentMethodologyRuns, getRecentPromptRuns } from '../_shared/storage.ts';

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'GET') return errorWithCors(request, 'Method not allowed', 405, 'METHOD_NOT_ALLOWED');

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get('limit') || 20);

  const boundedLimit = Math.max(1, Math.min(limit, 100));
  const promptRuns = getRecentPromptRuns(boundedLimit);
  const contextLogs = getRecentContextLogs(boundedLimit);
  const methodologyRuns = getRecentMethodologyRuns(boundedLimit);

  const successCount = promptRuns.filter((run) => run.validation_status === 'pass').length;
  const schemaFailures = promptRuns.filter(
    (run) => run.validation_status === 'fail' && (run.error_code || '').includes('VALIDATION')
  ).length;
  const fallbackCount = promptRuns.filter((run) => run.fallback_used).length;
  const citationMissingCount = promptRuns.filter((run) =>
    JSON.stringify(run.output_json || {}).toLowerCase().includes('no source found')
  ).length;

  const latencies = promptRuns.map((run) => run.latency_ms).sort((a, b) => a - b);
  const p95Index = latencies.length ? Math.min(latencies.length - 1, Math.ceil(latencies.length * 0.95) - 1) : -1;
  const p95 = p95Index >= 0 ? latencies[p95Index] : null;

  const avgContextTokenCount =
    contextLogs.length > 0
      ? Math.round(contextLogs.reduce((sum, item) => sum + item.token_count, 0) / contextLogs.length)
      : 0;

  return jsonWithCors(request, {
    prompt_runs: promptRuns,
    context_logs: contextLogs,
    methodology_runs: methodologyRuns,
    metrics: {
      prompt_success_rate: promptRuns.length ? Number((successCount / promptRuns.length).toFixed(4)) : 0,
      schema_validation_failure_rate: promptRuns.length ? Number((schemaFailures / promptRuns.length).toFixed(4)) : 0,
      fallback_invocation_rate: promptRuns.length ? Number((fallbackCount / promptRuns.length).toFixed(4)) : 0,
      avg_context_token_count: avgContextTokenCount,
      citation_missing_rate: promptRuns.length ? Number((citationMissingCount / promptRuns.length).toFixed(4)) : 0,
      p95_latency_ms: p95,
    },
  });
});
