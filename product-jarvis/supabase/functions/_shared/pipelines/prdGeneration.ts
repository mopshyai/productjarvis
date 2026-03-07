import { executePrompt } from '../promptEngine.ts';

export async function runPrdGeneration(workspaceId: string, input: Record<string, unknown>) {
  if (!String(input.feature_request || '').trim()) {
    throw new Error('feature_request is required');
  }

  return await executePrompt<Record<string, unknown>>({
    workspaceId,
    promptId: 'prd_generation',
    input,
  });
}
