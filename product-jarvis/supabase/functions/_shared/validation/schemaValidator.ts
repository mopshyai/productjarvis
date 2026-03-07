import type { ValidationErrorEnvelope } from '../prompts/types.ts';

export function validateRequiredKeys(obj: Record<string, unknown>, required: string[]) {
  const missing = required.filter((key) => !(key in obj));
  if (missing.length) {
    const err: ValidationErrorEnvelope = {
      code: 'VALIDATION_ERROR',
      message: `Missing required keys: ${missing.join(', ')}`,
      retryable: true,
      details: { missing },
    };
    throw err;
  }
}
