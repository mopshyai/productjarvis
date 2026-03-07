import type { ValidationErrorEnvelope } from '../prompts/types.ts';

export function parseStrictJson(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Top-level JSON must be an object');
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    const err: ValidationErrorEnvelope = {
      code: 'INVALID_JSON',
      message: error instanceof Error ? error.message : 'Invalid JSON response',
      retryable: true,
    };
    throw err;
  }
}
