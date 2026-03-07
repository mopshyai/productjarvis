import { executePrompt } from '../promptEngine.ts';

export async function runDecisionDetection(workspaceId: string, input: Record<string, unknown>) {
  if (!String(input.thread_or_transcript || '').trim()) {
    throw new Error('thread_or_transcript is required');
  }

  return await executePrompt<Record<string, unknown>>({
    workspaceId,
    promptId: 'decision_detection',
    input,
  });
}
