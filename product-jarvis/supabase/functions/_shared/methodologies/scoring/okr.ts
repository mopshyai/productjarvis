export function scoreOkrAlignment(input: Record<string, unknown>) {
  const okrs = Array.isArray(input.okrs) ? input.okrs : [];
  const initiative = String(input.feature_request || input.initiative || 'initiative').toLowerCase();
  const aligned = okrs.some((okr) => String(okr).toLowerCase().includes(initiative.split(' ')[0] || ''));
  return { aligned, matched_okr: aligned ? String(okrs[0]) : 'No direct match', confidence: aligned ? 0.74 : 0.41 };
}
