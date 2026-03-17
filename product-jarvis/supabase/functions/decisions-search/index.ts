import { body } from '../_shared/http.ts';
import { jsonWithCors, errorWithCors, handleCors } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';
import { logAuditEvent, searchDecisionRecords } from '../_shared/domainStore.ts';

type DecisionSearchInput = {
  workspace_id: string;
  query: string;
  filters?: Record<string, unknown>;
};

function buildTopLevelCitations(results: Array<{ sources?: Array<Record<string, unknown>> }>) {
  const flattened = results.flatMap((row) => row.sources || []);
  if (!flattened.length) {
    return [
      {
        id: 'no-source',
        source_type: 'system',
        source_id: 'no-source',
        source_url: '',
        excerpt: 'No source found',
        confidence: 0,
      },
    ];
  }
  return flattened.slice(0, 10);
}

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'POST') return errorWithCors(request, 'Method not allowed', 405, 'METHOD_NOT_ALLOWED');

  try {
    const payload = await body<DecisionSearchInput>(request);
    const query = String(payload.query || '').trim();
    if (!payload.workspace_id) {
      return errorWithCors(request, 'workspace_id is required', 400, 'MISSING_PARAMS');
    }

    const rl = await checkRateLimit(payload.workspace_id, 'decisions-search');
    if (!rl.allowed) {
      return errorWithCors(request, `Rate limit exceeded. Retry after ${Math.ceil(rl.retryAfterMs / 1000)}s`, 429, 'RATE_LIMITED');
    }

    if (!query) {
      return jsonWithCors(request, {
        results: [],
        citations: [
          {
            id: 'no-source',
            source_type: 'system',
            source_id: 'no-source',
            source_url: '',
            excerpt: 'No source found',
            confidence: 0,
          },
        ],
        confidence: 0,
        message: 'No decision record found for this query.',
      });
    }

    const results = await searchDecisionRecords(payload.workspace_id, query);
    await logAuditEvent(payload.workspace_id, 'decision_search', {
      query,
      result_count: results.length,
      filters: payload.filters || {},
    });

    if (!results.length) {
      return jsonWithCors(request, {
        results: [],
        citations: [
          {
            id: 'no-source',
            source_type: 'system',
            source_id: 'no-source',
            source_url: '',
            excerpt: 'No source found',
            confidence: 0,
          },
        ],
        confidence: 0,
        message: 'No decision record found for this query.',
      });
    }

    const confidence = Number(
      (
        results.reduce((sum, row) => {
          const avg =
            row.sources?.length
              ? row.sources.reduce((s, c) => s + (typeof c.confidence === 'number' ? c.confidence : 0.5), 0) / row.sources.length
              : 0.5;
          return sum + avg;
        }, 0) / results.length
      ).toFixed(2)
    );

    return jsonWithCors(request, {
      results,
      citations: buildTopLevelCitations(results),
      confidence,
      message: `Found ${results.length} matching decisions.`,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String(err.message) : 'Decision search failed';
    return errorWithCors(request, message, 400, 'DECISION_SEARCH_FAILED');
  }
});
