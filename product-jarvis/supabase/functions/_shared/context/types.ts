export type ContextSource = {
  name: 'recent_decisions' | 'sprint_state' | 'relevant_features' | 'user_signals' | 'metric_deltas';
  priority: number;
  content: string;
  missing: boolean;
};

export type ContextAssemblyInput = {
  product_context?: Record<string, unknown>;
  nowIso?: string;
  maxTokens?: number;
};

export type ContextAssemblyResult = {
  assembled_context: string;
  missing_context: string[];
  token_count: number;
  truncation_applied: boolean;
  sources: ContextSource[];
};
