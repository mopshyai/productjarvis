export function scoreKano(input: Record<string, unknown>) {
  const sentiment = String(input.sentiment || 'neutral').toLowerCase();
  const classification = sentiment.includes('love') ? 'delighter' : sentiment.includes('must') ? 'must-be' : 'performance';
  return { classification, confidence: 0.62 };
}
