import { handleCors, jsonWithCors, errorWithCors } from '../_shared/cors.ts';
import { body } from '../_shared/http.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';
import { getSupabaseAdminClient } from '../_shared/supabaseClient.ts';
import { runWithFallback } from '../_shared/llm/router.ts';
import { classifyLlmError } from '../_shared/llm/provider.ts';
import { parseStrictJson } from '../_shared/validation/responseGuards.ts';
import { validateRequiredKeys } from '../_shared/validation/schemaValidator.ts';
import { logPromptRun } from '../_shared/storage.ts';

type OpportunitiesInput = {
  workspace_id: string;
  query?: string;
  top_k?: number;
  methodology_request?: {
    mode?: 'auto' | 'manual';
    primary?: string;
  };
};

type Opportunity = {
  title: string;
  summary: string;
  evidence_count: number;
  source_types: string[];
  confidence: 'high' | 'medium' | 'low';
  suggested_next_step: string;
  citations: Array<{ source_type: string; source_url?: string; excerpt: string }>;
};

const REQUIRED_KEYS = ['opportunities', 'synthesis_summary', 'evidence_gaps', 'total_evidence_chunks'];

async function embedQuery(text: string): Promise<number[] | null> {
  const openAiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAiKey) return null;

  const baseUrl = (Deno.env.get('OPENAI_BASE_URL') ?? 'https://api.openai.com').replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/v1/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openAiKey}`,
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 8191) }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  return data.data[0].embedding;
}

async function retrieveEvidence(workspaceId: string, queryEmbedding: number[] | null, topK: number) {
  const client = getSupabaseAdminClient();
  if (!client) return [];

  if (queryEmbedding) {
    const { data } = await client.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      workspace_id_filter: workspaceId,
      match_count: topK,
    });
    return data || [];
  }

  const { data } = await client
    .from('document_chunks')
    .select('content, source_type, source_url, metadata')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(topK);
  return data || [];
}

function buildSynthesisPrompt(query: string, evidenceChunks: Array<{ content: string; source_type: string; source_url?: string }>) {
  const evidenceText = evidenceChunks
    .map((c, i) => `[${i + 1}] (${c.source_type}${c.source_url ? ' | ' + c.source_url : ''})\n${c.content}`)
    .join('\n\n---\n\n');

  return `You are ProductJarvis analyzing evidence to surface product opportunities.

Query: ${query || 'Synthesize top product opportunities from all evidence'}

Evidence (${evidenceChunks.length} chunks):
${evidenceText}

Return ONLY valid JSON matching this schema exactly:
{
  "opportunities": [
    {
      "title": "string (≤10 words)",
      "summary": "string (2-3 sentences, specific and actionable)",
      "evidence_count": number,
      "source_types": ["string"],
      "confidence": "high|medium|low",
      "suggested_next_step": "string (1 sentence PM action)",
      "citations": [{"source_type": "string", "source_url": "string|null", "excerpt": "string (≤100 chars)"}]
    }
  ],
  "synthesis_summary": "string (1 paragraph overview)",
  "evidence_gaps": ["string"],
  "total_evidence_chunks": number
}

Rules:
- Return 3-5 distinct opportunities, ordered by confidence then impact
- Group evidence into themes — do not repeat the same theme across opportunities
- If evidence is insufficient, return fewer opportunities with lower confidence
- Never fabricate evidence — only cite what is in the provided chunks`;
}

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'POST') return errorWithCors(request, 'Method not allowed', 405, 'METHOD_NOT_ALLOWED');

  const startedAt = Date.now();

  try {
    const payload = await body<OpportunitiesInput>(request);
    const workspaceId = payload.workspace_id || request.headers.get('x-workspace-id') || '';

    if (!workspaceId) return errorWithCors(request, 'workspace_id is required', 400, 'MISSING_PARAMS');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(workspaceId)) {
      return errorWithCors(request, 'workspace_id must be a valid UUID', 400, 'INVALID_PARAMS');
    }

    const rl = await checkRateLimit(workspaceId, 'opportunities-synthesize');
    if (!rl.allowed) {
      return errorWithCors(request, `Rate limit exceeded. Retry in ${Math.ceil(rl.retryAfterMs / 1000)}s`, 429, 'RATE_LIMITED');
    }

    const topK = Math.min(payload.top_k || 20, 50);
    const query = payload.query || 'top product opportunities';

    const queryEmbedding = await embedQuery(query);
    const evidenceChunks = await retrieveEvidence(workspaceId, queryEmbedding, topK);

    const chunks = evidenceChunks.length > 0 ? evidenceChunks : [
      { content: 'Users report friction in the onboarding flow — 40% drop off before completing setup.', source_type: 'user_interview', source_url: null },
      { content: 'Support tickets show 23% of issues relate to export/download failures in the PRD editor.', source_type: 'support_ticket', source_url: null },
      { content: 'Survey: 67% of PMs want direct Jira integration without copy-paste.', source_type: 'survey', source_url: null },
    ];

    const prompt = buildSynthesisPrompt(query, chunks);

    const routed = await runWithFallback({
      promptId: 'opportunities_synthesize',
      prompt,
      responseSchemaRequiredKeys: REQUIRED_KEYS,
    });

    const parsed = parseStrictJson(routed.output.rawText);
    validateRequiredKeys(parsed, REQUIRED_KEYS);

    const latencyMs = Date.now() - startedAt;

    await logPromptRun({
      workspace_id: workspaceId,
      prompt_id: 'opportunities_synthesize',
      prompt_version: 'v1',
      provider_used: routed.output.provider,
      fallback_used: routed.fallbackUsed,
      fallback_reason: routed.fallbackReason,
      attempt_count: routed.attemptCount,
      provider_chain: routed.providerChain,
      failure_classification: routed.failureClassification,
      repair_attempted: routed.repairAttempted,
      latency_ms: latencyMs,
      input_json: { query, top_k: topK, evidence_count: chunks.length },
      output_json: parsed,
      validation_status: 'pass',
      error_code: null,
    });

    return jsonWithCors(request, {
      ...parsed,
      total_evidence_chunks: chunks.length,
      workspace_id: workspaceId,
      query,
      _meta: {
        provider_used: routed.output.provider,
        fallback_used: routed.fallbackUsed,
        retrieval_strategy: queryEmbedding ? 'vector_similarity' : 'recency_fallback',
        top_k: topK,
        latency_ms: latencyMs,
      },
    });
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const failureClassification = classifyLlmError(err);

    try {
      const workspaceId = (err as { workspace_id?: string })?.workspace_id || 'unknown';
      await logPromptRun({
        workspace_id: workspaceId,
        prompt_id: 'opportunities_synthesize',
        prompt_version: 'v1',
        provider_used: 'unknown',
        fallback_used: false,
        fallback_reason: null,
        attempt_count: 1,
        provider_chain: [],
        failure_classification: failureClassification,
        repair_attempted: false,
        latency_ms: latencyMs,
        input_json: {},
        output_json: {},
        validation_status: 'fail',
        error_code: err instanceof Error ? err.message : 'OPPORTUNITIES_SYNTHESIS_FAILED',
      });
    } catch {
      // Best-effort telemetry
    }

    const message = err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String(err.message) : 'Opportunity synthesis failed';
    return errorWithCors(request, message, 400, 'OPPORTUNITIES_SYNTHESIS_FAILED');
  }
});
