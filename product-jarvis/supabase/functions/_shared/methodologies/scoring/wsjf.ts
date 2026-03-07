export function scoreWsjf(input: Record<string, unknown>) {
  const bv = Number(input.business_value || 5);
  const tc = Number(input.time_criticality || 5);
  const rr = Number(input.risk_reduction || 5);
  const js = Number(input.job_size || 5);
  const score = js <= 0 ? 0 : (bv + tc + rr) / js;
  return { score: Number(score.toFixed(2)), components: { business_value: bv, time_criticality: tc, risk_reduction: rr, job_size: js } };
}
