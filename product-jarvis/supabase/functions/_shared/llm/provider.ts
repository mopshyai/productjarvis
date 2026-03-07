import type { PromptId } from '../prompts/types.ts';

export type FailureClassification = 'timeout' | 'provider_5xx' | 'non_json' | 'schema_error' | 'unknown';

export type LlmRunInput = {
  promptId: PromptId;
  prompt: string;
  responseSchemaRequiredKeys: string[];
};

export type LlmRunOutput = {
  rawText: string;
  provider: string;
};

export interface LlmProvider {
  run(input: LlmRunInput): Promise<LlmRunOutput>;
}

export class LlmProviderError extends Error {
  classification: FailureClassification;
  statusCode: number | null;
  retryable: boolean;

  constructor(
    message: string,
    classification: FailureClassification,
    options?: { statusCode?: number | null; retryable?: boolean }
  ) {
    super(message);
    this.name = 'LlmProviderError';
    this.classification = classification;
    this.statusCode = options?.statusCode ?? null;
    this.retryable = options?.retryable ?? true;
  }
}

export function classifyLlmError(error: unknown): FailureClassification {
  if (error instanceof LlmProviderError) {
    return error.classification;
  }
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('timeout') || message.includes('aborted')) return 'timeout';
  if (message.includes('5')) return 'provider_5xx';
  return 'unknown';
}
