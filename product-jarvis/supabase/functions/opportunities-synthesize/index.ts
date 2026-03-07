import { handleCors, jsonWithCors, errorWithCors } from '../_shared/cors.ts';
import { body } from '../_shared/http.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';
import { getSupabaseAdminClient } from '../_shared/supabaseClient.ts';
import { ClaudeProvider } from '../_shared/llm/claude.ts';

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
    // Vector similarity search via pgvector
    const { data } = await client.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      workspace_id_filter: workspaceId,
      match_count: topK,
    });
    return data || [];
  }

  // Fallback: most recent chunks
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

  try {
    const payload = await body<OpportunitiesInput>(request);
    const workspaceId = payload.workspace_id || request.headers.get('x-workspace-id') || '';

    if (!workspaceId) return errorWithCors(request, 'workspace_id is required', 400, 'MISSING_PARAMS');

    const rl = checkRateLimit(workspaceId, 'opportunities-synthesize');
    if (!rl.allowed) {
      return errorWithCors(request, `Rate limit exceeded. Retry in ${Math.ceil(rl.retryAfterMs / 1000)}s`, 429, 'RATE_LIMITED');
    }

    const topK = Math.min(payload.top_k || 20, 50);
    const query = payload.query || 'top product opportunities';

    const queryEmbedding = await embedQuery(query);
    const evidenceChunks = await retrieveEvidence(workspaceId, queryEmbedding, topK);

    // Mock evidence for development when no DB
    const chunks = evidenceChunks.length > 0 ? evidenceChunks : [
      { content: 'Users report friction in the onboarding flow — 40% drop off before completing setup.', source_type: 'user_interview', source_url: null },
      { content: 'Support tickets show 23% of issues relate to export/download failures in the PRD editor.', source_type: 'support_ticket', source_url: null },
      { content: 'Survey: 67% of PMs want direct Jira integration without copy-paste.', source_type: 'survey', source_url: null },
    ];

    const prompt = buildSynthesisPrompt(query, chunks);
    const claude = new ClaudeProvider();
    const llmOutput = await claude.run({ promptId: 'opportunities_synthesize', prompt });

    let parsed: { opportunities: Opportunity[]; synthesis_summary: string; evidence_gaps: string[]; total_evidence_chunks: number };
    try {
      const cleaned = llmOutput.rawText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error('Failed to parse opportunities synthesis response');
    }

    return jsonWithCors(request, {
      ...parsed,
      total_evidence_chunks: chunks.length,
      workspace_id: workspaceId,
      query,
      _meta: {
        provider_used: llmOutput.provider,
        retrieval_strategy: queryEmbedding ? 'vector_similarity' : 'recency_fallback',
        top_k: topK,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String(err.message) : 'Opportunity synthesis failed';
    return errorWithCors(request, message, 400, 'OPPORTUNITIES_SYNTHESIS_FAILED');
  }
});
