import { LlmProviderError, type LlmProvider, type LlmRunInput, type LlmRunOutput } from './provider.ts';
import { buildFallbackJson } from './mockJson.ts';

const SYSTEM_PROMPT = `You are ProductJarvis, an AI product operating system built for product managers.

CRITICAL RULES:
1. Return ONLY valid JSON. No markdown, no code fences, no explanation text.
2. Every field in the required schema MUST be present in your response.
3. Be specific and actionable — never use placeholder text like "TBD" or "To be determined".
4. Ground every claim in the provided context. If context is missing, say so explicitly in missing_context.
5. Use real PM terminology: acceptance criteria must be testable, user stories must follow As-a/I-want/So-that, metrics must have baselines and targets.
6. When you detect conflicts between the feature request and existing product context, flag them in conflicts_detected.
7. Never fabricate data sources. If you have no source, use the no-source citation marker.`;

// Model routing: resolve the right model tier for each prompt type.
// CLAUDE_MODEL env var overrides everything (useful for testing a specific model).
function resolveModel(promptId: string): string {
  const override = Deno.env.get('CLAUDE_MODEL');
  if (override) return override;

  const haiku = Deno.env.get('ANTHROPIC_DEFAULT_HAIKU_MODEL') ?? 'claude-haiku-4-5-20251001';
  const sonnet = Deno.env.get('ANTHROPIC_DEFAULT_SONNET_MODEL') ?? 'claude-sonnet-4-6-20250929';
  const opus = Deno.env.get('ANTHROPIC_DEFAULT_OPUS_MODEL') ?? 'claude-opus-4-6-thinking';

  switch (promptId) {
    // Fast/cheap tasks — Haiku
    case 'command_router':
    case 'prd_health':
    case 'daily_digest':
    case 'decision_detection':
      return haiku;
    // Complex methodology reasoning — Opus
    case 'methodology_reasoning':
      return opus;
    // PRD generation, opportunity synthesis, ticket factory, stakeholder updates — Sonnet
    case 'prd_generation':
    case 'opportunities_synthesize':
    case 'ticket_factory':
    case 'stakeholder_update':
    default:
      return sonnet;
  }
}

export class ClaudeProvider implements LlmProvider {
  async run(input: LlmRunInput): Promise<LlmRunOutput> {
    // Prefer ANTHROPIC_AUTH_TOKEN (Quatarly gateway), fall back to direct ANTHROPIC_API_KEY
    const key = Deno.env.get('ANTHROPIC_AUTH_TOKEN') ?? Deno.env.get('ANTHROPIC_API_KEY');
    if (!key) {
      return { rawText: JSON.stringify(buildFallbackJson(input.promptId)), provider: 'claude_mock' };
    }

    const baseUrl = (Deno.env.get('ANTHROPIC_BASE_URL') ?? 'https://api.anthropic.com').replace(/\/$/, '');
    const timeoutMs = Number(Deno.env.get('CLAUDE_TIMEOUT_MS') || 60000);
    const model = resolveModel(input.promptId);
    const maxTokens = input.promptId === 'prd_generation' || input.promptId === 'ticket_factory' ? 8000 : 4000;

    console.log(`[ClaudeProvider] promptId=${input.promptId} model=${model} baseUrl=${baseUrl}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort('timeout'), timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature: 0,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: input.prompt }],
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new LlmProviderError('Claude timeout', 'timeout', { retryable: true });
      }
      throw new LlmProviderError(error instanceof Error ? error.message : 'Claude request failed', 'unknown', {
        retryable: true,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      let errorBody = '';
      try { errorBody = await response.text(); } catch { /* ignore */ }
      const classification = response.status >= 500 ? 'provider_5xx'
        : response.status === 429 ? 'timeout'
        : 'unknown';
      throw new LlmProviderError(
        `Claude ${response.status}: ${errorBody.slice(0, 200)}`,
        classification,
        { statusCode: response.status, retryable: response.status >= 429 }
      );
    }

    const payload = await response.json();
    const text = payload?.content?.[0]?.text;
    if (typeof text !== 'string') {
      throw new LlmProviderError('Claude returned unexpected response shape', 'unknown', {
        retryable: true,
      });
    }

    // Strip markdown code fences if the model wraps the JSON
    const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

    return { rawText: cleaned, provider: 'claude' };
  }
}
