import { handleCors, jsonWithCors, errorWithCors } from '../_shared/cors.ts';
import { body } from '../_shared/http.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';
import { getSupabaseAdminClient } from '../_shared/supabaseClient.ts';

type EvidenceIngestInput = {
  workspace_id: string;
  source_type: 'user_interview' | 'survey' | 'support_ticket' | 'analytics' | 'competitor' | 'document';
  source_url?: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
};

async function embedText(text: string): Promise<number[]> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    // Mock embedding for development — 1536-dim zero vector
    return new Array(1536).fill(0);
  }

  // Use OpenAI embeddings if key is available (pgvector works with any fixed-dim embedding)
  const openAiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAiKey) {
    return new Array(1536).fill(0);
  }

  const baseUrl = (Deno.env.get('OPENAI_BASE_URL') ?? 'https://api.openai.com').replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/v1/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openAiKey}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8191), // API limit
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

function chunkText(text: string, maxChars = 1000, overlap = 200): string[] {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length);
    chunks.push(text.slice(start, end));
    start += maxChars - overlap;
  }
  return chunks;
}

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'POST') return errorWithCors(request, 'Method not allowed', 405, 'METHOD_NOT_ALLOWED');

  try {
    const payload = await body<EvidenceIngestInput>(request);
    const workspaceId = payload.workspace_id || request.headers.get('x-workspace-id') || '';

    if (!workspaceId) return errorWithCors(request, 'workspace_id is required', 400, 'MISSING_PARAMS');
    if (!payload.content?.trim()) return errorWithCors(request, 'content is required', 400, 'MISSING_PARAMS');
    if (!payload.title?.trim()) return errorWithCors(request, 'title is required', 400, 'MISSING_PARAMS');
    if (!payload.source_type) return errorWithCors(request, 'source_type is required', 400, 'MISSING_PARAMS');

    const rl = checkRateLimit(workspaceId, 'evidence-ingest');
    if (!rl.allowed) {
      return errorWithCors(request, `Rate limit exceeded. Retry in ${Math.ceil(rl.retryAfterMs / 1000)}s`, 429, 'RATE_LIMITED');
    }

    const client = getSupabaseAdminClient();

    // Create ingestion job record
    let jobId: string | null = null;
    if (client) {
      const { data: job, error: jobError } = await client
        .from('ingestion_jobs')
        .insert({
          workspace_id: workspaceId,
          source_type: payload.source_type,
          source_url: payload.source_url || null,
          title: payload.title,
          status: 'processing',
          chunk_count: 0,
        })
        .select('id')
        .single();
      if (!jobError) jobId = job?.id;
    }

    // Chunk content
    const chunks = chunkText(payload.content);
    const chunksStored: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await embedText(chunk);

      if (client) {
        const { data: stored } = await client
          .from('document_chunks')
          .insert({
            workspace_id: workspaceId,
            source_type: payload.source_type,
            source_url: payload.source_url || null,
            job_id: jobId,
            chunk_index: i,
            content: chunk,
            embedding,
            metadata: payload.metadata || {},
          })
          .select('id')
          .single();
        if (stored?.id) chunksStored.push(stored.id);
      } else {
        // Mock mode
        chunksStored.push(`mock_chunk_${i}`);
      }
    }

    // Update job status
    if (client && jobId) {
      await client
        .from('ingestion_jobs')
        .update({ status: 'complete', chunk_count: chunksStored.length, completed_at: new Date().toISOString() })
        .eq('id', jobId);
    }

    return jsonWithCors(request, {
      job_id: jobId || `mock_job_${Date.now()}`,
      workspace_id: workspaceId,
      source_type: payload.source_type,
      title: payload.title,
      chunk_count: chunksStored.length,
      chunk_ids: chunksStored,
      status: 'complete',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String(err.message) : 'Evidence ingest failed';
    return errorWithCors(request, message, 400, 'EVIDENCE_INGEST_FAILED');
  }
});
