import type { ContextAssemblyInput, ContextAssemblyResult, ContextSource } from './types.ts';
import { getRecentDecisions } from './retrievers/recentDecisions.ts';
import { getRecentDecisionsFromDb } from './retrievers/recentDecisions.ts';
import { getSprintState } from './retrievers/sprintState.ts';
import { getSprintStateFromDb } from './retrievers/sprintState.ts';
import { getRelevantFeatures } from './retrievers/relevantFeatures.ts';
import { getRelevantFeaturesFromDb } from './retrievers/relevantFeatures.ts';
import { getUserSignals } from './retrievers/userSignals.ts';
import { getUserSignalsFromDb } from './retrievers/userSignals.ts';
import { getMetricDeltas } from './retrievers/metricDeltas.ts';
import { getMetricDeltasFromDb } from './retrievers/metricDeltas.ts';

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/** Synchronous assembly from in-memory product_context (original behavior). */
export function assembleContext(input: ContextAssemblyInput): ContextAssemblyResult {
  const context = input.product_context || {};
  const maxTokens = input.maxTokens || 40000;

  const sources: ContextSource[] = [
    { name: 'recent_decisions', priority: 1, content: getRecentDecisions(context), missing: false },
    { name: 'sprint_state', priority: 2, content: getSprintState(context), missing: false },
    { name: 'relevant_features', priority: 3, content: getRelevantFeatures(context), missing: false },
    { name: 'user_signals', priority: 4, content: getUserSignals(context), missing: false },
    { name: 'metric_deltas', priority: 5, content: getMetricDeltas(context), missing: false },
  ].map((source) => ({ ...source, missing: !source.content.trim() }));

  return buildResult(sources, maxTokens);
}

/** Async assembly that enriches with real DB data when available. */
export async function assembleContextEnriched(
  workspaceId: string,
  input: ContextAssemblyInput
): Promise<ContextAssemblyResult> {
  const context = input.product_context || {};
  const maxTokens = input.maxTokens || 40000;
  const useDb = isUuid(workspaceId);

  const [dbDecisions, dbSprint, dbFeatures, dbSignals, dbMetrics] = useDb
    ? await Promise.all([
        getRecentDecisionsFromDb(workspaceId),
        getSprintStateFromDb(workspaceId),
        getRelevantFeaturesFromDb(workspaceId),
        getUserSignalsFromDb(workspaceId),
        getMetricDeltasFromDb(workspaceId),
      ])
    : ['', '', '', '', ''];

  const sources: ContextSource[] = [
    {
      name: 'recent_decisions',
      priority: 1,
      content: dbDecisions || getRecentDecisions(context),
      missing: false,
    },
    {
      name: 'sprint_state',
      priority: 2,
      content: dbSprint || getSprintState(context),
      missing: false,
    },
    {
      name: 'relevant_features',
      priority: 3,
      content: dbFeatures || getRelevantFeatures(context),
      missing: false,
    },
    {
      name: 'user_signals',
      priority: 4,
      content: dbSignals || getUserSignals(context),
      missing: false,
    },
    {
      name: 'metric_deltas',
      priority: 5,
      content: dbMetrics || getMetricDeltas(context),
      missing: false,
    },
  ].map((source) => ({ ...source, missing: !source.content.trim() }));

  return buildResult(sources, maxTokens);
}

function buildResult(sources: ContextSource[], maxTokens: number): ContextAssemblyResult {
  const missing_context = sources.filter((source) => source.missing).map((source) => source.name);
  const ordered = [...sources].sort((a, b) => a.priority - b.priority);
  let built = '';
  let truncation_applied = false;

  for (const source of ordered) {
    if (!source.content.trim()) continue;
    const chunk = `\n[${source.name}]\n${source.content}\n`;
    const next = built + chunk;
    if (estimateTokens(next) > maxTokens) {
      truncation_applied = true;
      break;
    }
    built = next;
  }

  return {
    assembled_context: built.trim(),
    missing_context,
    token_count: estimateTokens(built),
    truncation_applied,
    sources,
  };
}
