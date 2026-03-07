import { executePrompt } from '../promptEngine.ts';

export async function runStakeholderUpdate(workspaceId: string, input: Record<string, unknown>) {
  if (!String(input.audience || '').trim()) {
    throw new Error('audience is required');
  }

  return await executePrompt<Record<string, unknown>>({
    workspaceId,
    promptId: 'stakeholder_update',
    input,
  });
}
