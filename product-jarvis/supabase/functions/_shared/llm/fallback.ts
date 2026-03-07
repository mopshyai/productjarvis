import { LlmProviderError, type LlmProvider, type LlmRunInput, type LlmRunOutput } from './provider.ts';
import { buildFallbackJson } from './mockJson.ts';

export class OpenAiCompatibleFallbackProvider implements LlmProvider {
  async run(input: LlmRunInput): Promise<LlmRunOutput> {
    const key = Deno.env.get('OPENAI_API_KEY');
    if (!key) {
      return { rawText: JSON.stringify(buildFallbackJson(input.promptId)), provider: 'openai_mock' };
    }

    const baseUrl = (Deno.env.get('OPENAI_BASE_URL') ?? 'https://api.openai.com').replace(/\/$/, '');
    const timeoutMs = Number(Deno.env.get('OPENAI_TIMEOUT_MS') || 60000);
    const model = Deno.env.get('OPENAI_MODEL') || 'gpt-5.1';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort('timeout'), timeoutMs);

    console.log(`[OpenAiCompatibleFallbackProvider] promptId=${input.promptId} model=${model} baseUrl=${baseUrl}`);

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: 'You are ProductJarvis, an AI product operating system. Return ONLY valid JSON matching the required schema. No markdown, no explanation.',
            },
            { role: 'user', content: input.prompt },
          ],
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new LlmProviderError('OpenAI timeout', 'timeout', { retryable: true });
      }
      throw new LlmProviderError(
        error instanceof Error ? error.message : 'OpenAI request failed',
        'unknown',
        { retryable: true }
      );
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
        `OpenAI ${response.status}: ${errorBody.slice(0, 200)}`,
        classification,
        { statusCode: response.status, retryable: response.status >= 429 }
      );
    }

    const payload = await response.json();
    const text = payload?.choices?.[0]?.message?.content;
    if (typeof text !== 'string') {
      throw new LlmProviderError('OpenAI returned unexpected response shape', 'unknown', {
        retryable: true,
      });
    }

    const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

    return { rawText: cleaned, provider: 'openai_compatible' };
  }
}
