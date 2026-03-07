import { ClaudeProvider } from './claude.ts';
import { OpenAiCompatibleFallbackProvider } from './fallback.ts';
import { classifyLlmError, LlmProviderError, type FailureClassification, type LlmRunInput, type LlmRunOutput } from './provider.ts';

export type RoutedLlmOutput = {
  output: LlmRunOutput;
  fallbackUsed: boolean;
  fallbackReason: string | null;
  failureClassification: FailureClassification | null;
  repairAttempted: boolean;
  attemptCount: number;
  providerChain: string[];
};

const primary = new ClaudeProvider();
const fallback = new OpenAiCompatibleFallbackProvider();

function supportsFallback(classification: FailureClassification) {
  return classification === 'timeout' || classification === 'provider_5xx';
}

export async function runPrimary(input: LlmRunInput): Promise<LlmRunOutput> {
  return primary.run(input);
}

export async function runFallback(input: LlmRunInput): Promise<LlmRunOutput> {
  return fallback.run(input);
}

export async function runWithFallback(input: LlmRunInput): Promise<RoutedLlmOutput> {
  let classification: FailureClassification | null = null;

  try {
    const output = await runPrimary(input);
    return {
      output,
      fallbackUsed: false,
      fallbackReason: null,
      failureClassification: null,
      repairAttempted: false,
      attemptCount: 1,
      providerChain: [output.provider],
    };
  } catch (error) {
    classification = classifyLlmError(error);
    if (!supportsFallback(classification)) {
      if (error instanceof LlmProviderError) {
        throw error;
      }
      throw new LlmProviderError(
        error instanceof Error ? error.message : 'Primary provider failed',
        classification,
        { retryable: false }
      );
    }

    const output = await runFallback(input);
    return {
      output,
      fallbackUsed: true,
      fallbackReason: error instanceof Error ? error.message : 'Primary provider failed',
      failureClassification: classification,
      repairAttempted: false,
      attemptCount: 2,
      providerChain: ['claude', output.provider],
    };
  }
}
