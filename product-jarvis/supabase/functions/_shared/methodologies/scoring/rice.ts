export function scoreRice(input: Record<string, unknown>) {
  const reach = Number(input.reach || 0);
  const impact = Number(input.impact || 0);
  const confidence = Number(input.confidence || 0.7);
  const effort = Number(input.effort || 1);
  const score = effort <= 0 ? 0 : (reach * impact * confidence) / effort;
  return { score: Number(score.toFixed(2)), components: { reach, impact, confidence, effort } };
}
