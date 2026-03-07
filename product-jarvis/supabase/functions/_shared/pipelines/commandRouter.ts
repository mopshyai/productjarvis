import { executePrompt } from '../promptEngine.ts';

export async function runCommandRouter(workspaceId: string, input: Record<string, unknown>) {
  if (!String(input.user_input || '').trim()) {
    throw new Error('user_input is required');
  }

  return await executePrompt<Record<string, unknown>>({
    workspaceId,
    promptId: 'command_router',
    input,
  });
}
