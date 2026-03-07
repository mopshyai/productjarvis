import { getMethodologyCatalog } from './registry.ts';
import type { MethodologyDefinition, MethodologyId, MethodologyRequest, MethodologySelection } from './types.ts';

const INTENT_DEFAULTS: Record<string, MethodologyId[]> = {
  prd_generation: ['rice', 'jtbd', 'scrum', 'okr_alignment'],
  ticket_factory: ['sprint_planning', 'scrum', 'raid', 'critical_path'],
  command_router: ['rice', 'okr_alignment', 'scrum'],
  prd_health: ['okr_alignment', 'raid', 'raci'],
  daily_digest: ['raid', 'aarrr', 'heart'],
  decision_detection: ['rfc', 'raci', 'five_whys'],
  stakeholder_update: ['prfaq', 'north_star_metric', 'okr_alignment'],
};

function dedupe<T>(arr: T[]) {
  return [...new Set(arr)];
}

function missingInputs(def: MethodologyDefinition, input: Record<string, unknown>) {
  return def.inputs_required.filter((key) => {
    const value = input[key];
    if (Array.isArray(value)) return value.length === 0;
    return value === undefined || value === null || String(value).trim() === '';
  });
}

export async function selectMethodologies(
  promptId: string,
  request: MethodologyRequest | undefined,
  input: Record<string, unknown>
): Promise<MethodologySelection> {
  const catalog = await getMethodologyCatalog();
  const excluded = new Set(request?.exclude || []);
  const defaults = INTENT_DEFAULTS[promptId] || ['rice', 'scrum', 'okr_alignment'];

  const mode = request?.mode || 'auto';
  const warnings: string[] = [];

  let primary: MethodologyId;
  let supporting: MethodologyId[];

  if (mode === 'manual' && request?.primary) {
    primary = request.primary;
    supporting = request.supporting || [];
  } else {
    const candidates = defaults.filter((id) => !excluded.has(id));
    primary = (request?.primary && !excluded.has(request.primary) ? request.primary : candidates[0]) as MethodologyId;
    supporting = request?.supporting?.length
      ? request.supporting.filter((id) => id !== primary && !excluded.has(id)).slice(0, 4)
      : candidates.filter((id) => id !== primary).slice(0, 4);
  }

  if (!primary) {
    primary = 'rice';
    warnings.push('Primary methodology fell back to rice due to invalid input.');
  }

  const known = new Set(catalog.map((item) => item.id));
  if (!known.has(primary)) {
    warnings.push(`Unknown primary methodology: ${primary}. Falling back to rice.`);
    primary = 'rice';
  }

  supporting = dedupe(supporting.filter((id) => known.has(id) && id !== primary)).slice(0, 4);

  const selectedDefs = catalog.filter((item) => item.id === primary || supporting.includes(item.id));
  const missing = dedupe(selectedDefs.flatMap((item) => missingInputs(item, input)));

  const primaryDef = catalog.find((item) => item.id === primary);
  if (primaryDef?.conflicts_with.some((id) => supporting.includes(id))) {
    warnings.push(`Conflict detected: ${primaryDef.name} with ${primaryDef.conflicts_with.join(', ')}`);
  }

  return {
    primary,
    supporting,
    selection_reason:
      mode === 'manual'
        ? 'Manual methodology selection applied from request override.'
        : `Auto-selected based on ${promptId} intent with primary + supporting framework policy.`,
    warnings,
    missing_inputs: missing,
  };
}
