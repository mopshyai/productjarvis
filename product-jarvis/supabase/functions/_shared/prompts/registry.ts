import type { PromptConfig, PromptId } from './types.ts';

const PROMPTS: Record<PromptId, PromptConfig> = {
  prd_generation: {
    id: 'prd_generation',
    version: 'v1',
    templatePath: 'templates/prd_generation.v1.md',
    schemaPath: 'schemas/prd_generation.v1.json',
    maxContextTokens: 40000,
    modelPolicy: { primary: 'claude', fallback: 'openai_compatible' },
  },
  ticket_factory: {
    id: 'ticket_factory',
    version: 'v1',
    templatePath: 'templates/ticket_factory.v1.md',
    schemaPath: 'schemas/ticket_factory.v1.json',
    maxContextTokens: 40000,
    modelPolicy: { primary: 'claude', fallback: 'openai_compatible' },
  },
  decision_detection: {
    id: 'decision_detection',
    version: 'v1',
    templatePath: 'templates/decision_detection.v1.md',
    schemaPath: 'schemas/decision_detection.v1.json',
    maxContextTokens: 40000,
    modelPolicy: { primary: 'claude', fallback: 'openai_compatible' },
  },
  daily_digest: {
    id: 'daily_digest',
    version: 'v1',
    templatePath: 'templates/daily_digest.v1.md',
    schemaPath: 'schemas/daily_digest.v1.json',
    maxContextTokens: 40000,
    modelPolicy: { primary: 'claude', fallback: 'openai_compatible' },
  },
  command_router: {
    id: 'command_router',
    version: 'v1',
    templatePath: 'templates/command_router.v1.md',
    schemaPath: 'schemas/command_router.v1.json',
    maxContextTokens: 40000,
    modelPolicy: { primary: 'claude', fallback: 'openai_compatible' },
  },
  prd_health: {
    id: 'prd_health',
    version: 'v1',
    templatePath: 'templates/prd_health.v1.md',
    schemaPath: 'schemas/prd_health.v1.json',
    maxContextTokens: 40000,
    modelPolicy: { primary: 'claude', fallback: 'openai_compatible' },
  },
  stakeholder_update: {
    id: 'stakeholder_update',
    version: 'v1',
    templatePath: 'templates/stakeholder_update.v1.md',
    schemaPath: 'schemas/stakeholder_update.v1.json',
    maxContextTokens: 40000,
    modelPolicy: { primary: 'claude', fallback: 'openai_compatible' },
  },
  opportunities_synthesize: {
    id: 'opportunities_synthesize',
    version: 'v1',
    templatePath: 'templates/opportunities_synthesize.v1.md',
    schemaPath: 'schemas/opportunities_synthesize.v1.json',
    maxContextTokens: 40000,
    modelPolicy: { primary: 'claude', fallback: 'openai_compatible' },
  },
  methodology_reasoning: {
    id: 'methodology_reasoning',
    version: 'v1',
    templatePath: 'templates/methodology_reasoning.v1.md',
    schemaPath: 'schemas/methodology_reasoning.v1.json',
    maxContextTokens: 40000,
    modelPolicy: { primary: 'claude', fallback: 'openai_compatible' },
  },
};

const BASE = new URL('.', import.meta.url);

async function readText(relativePath: string) {
  const url = new URL(relativePath, BASE);
  return await Deno.readTextFile(url);
}

export function getPromptConfig(id: PromptId): PromptConfig {
  return PROMPTS[id];
}

export async function getPromptTemplate(id: PromptId): Promise<string> {
  const cfg = getPromptConfig(id);
  return await readText(cfg.templatePath);
}

export async function getPromptSchema(id: PromptId): Promise<{ required: string[] }> {
  const cfg = getPromptConfig(id);
  const raw = await readText(cfg.schemaPath);
  return JSON.parse(raw);
}
