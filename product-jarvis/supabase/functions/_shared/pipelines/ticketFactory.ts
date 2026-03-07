import { executePrompt } from '../promptEngine.ts';

export async function runTicketFactory(workspaceId: string, input: Record<string, unknown>) {
  if (!input.prd_content) {
    throw new Error('prd_content is required');
  }

  return await executePrompt<Record<string, unknown>>({
    workspaceId,
    promptId: 'ticket_factory',
    input,
  });
}
