import { runMethodologyExecutor } from './executors/index.ts';
import { selectMethodologies } from './selector.ts';
import type { MethodologyRequest } from './types.ts';

export async function resolveMethodologyBundle(
  promptId: string,
  input: Record<string, unknown>,
  request?: MethodologyRequest
) {
  const selection = await selectMethodologies(promptId, request, input);
  const allMethods = [selection.primary, ...selection.supporting];
  const outputs: Record<string, unknown> = {};

  for (const method of allMethods) {
    outputs[method] = runMethodologyExecutor(method, input);
  }

  return {
    applied: {
      primary: selection.primary,
      supporting: selection.supporting,
      selection_reason: selection.selection_reason,
      warnings: selection.warnings,
      missing_inputs: selection.missing_inputs,
    },
    outputs,
  };
}
