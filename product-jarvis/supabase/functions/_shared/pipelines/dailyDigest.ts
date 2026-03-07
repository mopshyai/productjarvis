import { executePrompt } from '../promptEngine.ts';

export async function runDailyDigest(workspaceId: string, input: Record<string, unknown>) {
  return await executePrompt<Record<string, unknown>>({
    workspaceId,
    promptId: 'daily_digest',
    input,
  });
}
