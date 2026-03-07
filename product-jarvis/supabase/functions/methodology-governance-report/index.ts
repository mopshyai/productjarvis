import { jsonWithCors, errorWithCors, handleCors } from '../_shared/cors.ts';
import { getMethodologyCatalog } from '../_shared/methodologies/registry.ts';
import { getRecentPromptRuns } from '../_shared/storage.ts';

const REQUIRED_CATEGORIES = ['prioritization', 'discovery', 'planning', 'documentation', 'metrics'];

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'GET') return errorWithCors(request, 'Method not allowed', 405, 'METHOD_NOT_ALLOWED');

  const adminToken = request.headers.get('x-admin-token');
  if (!adminToken) return errorWithCors(request, 'admin token required', 403, 'FORBIDDEN');

  const catalog = await getMethodologyCatalog();
  const recentRuns = getRecentPromptRuns(200);
  const byCategory = Object.fromEntries(
    REQUIRED_CATEGORIES.map((category) => [category, catalog.filter((m) => m.category === category && !m.deprecated).length])
  );

  const gaps = REQUIRED_CATEGORIES.filter((category) => (byCategory[category] || 0) < 4);

  const recentWindow = recentRuns.slice(0, 100);
  const schemaFailures = recentWindow.filter(
    (run) => run.validation_status === 'fail' && (run.error_code || '').toLowerCase().includes('validation')
  ).length;
  const fallbackCount = recentWindow.filter((run) => run.fallback_used).length;
  const p95 = (() => {
    const values = recentWindow.map((run) => run.latency_ms).sort((a, b) => a - b);
    if (!values.length) return 0;
    const idx = Math.min(values.length - 1, Math.ceil(values.length * 0.95) - 1);
    return values[idx];
  })();

  const thresholdChecks = {
    schema_failure_rate_over_2pct_15m: recentWindow.length ? schemaFailures / recentWindow.length > 0.02 : false,
    fallback_rate_over_15pct_30m: recentWindow.length ? fallbackCount / recentWindow.length > 0.15 : false,
    p95_latency_over_30s: p95 > 30000,
  };

  return jsonWithCors(request, {
    generated_at: new Date().toISOString(),
    summary: {
      total_methods: catalog.length,
      deprecated_count: catalog.filter((item) => item.deprecated).length,
      category_distribution: byCategory,
    },
    gaps,
    recommendations: [
      gaps.length ? `Add additional methodologies for categories: ${gaps.join(', ')}` : 'No category coverage gaps detected.',
      'Review registry monthly and bump methodology registry version when changes are approved.',
    ],
    runtime_health: {
      sample_size: recentWindow.length,
      schema_failure_rate: recentWindow.length ? Number((schemaFailures / recentWindow.length).toFixed(4)) : 0,
      fallback_rate: recentWindow.length ? Number((fallbackCount / recentWindow.length).toFixed(4)) : 0,
      p95_latency_ms: p95,
      threshold_checks: thresholdChecks,
    },
  });
});
