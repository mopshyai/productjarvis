export type Citation = {
  id: string;
  source_type: string;
  source_id: string;
  source_url: string;
  excerpt: string;
  confidence: number;
};

export type PromptExecutionInput<T> = {
  workspace_id: string;
  payload: T;
};

export type PromptExecutionResult<T> = {
  data: T;
  provider_used: string;
  fallback_used: boolean;
  fallback_reason: string | null;
  attempt_count: number;
  provider_chain: string[];
  failure_classification: 'timeout' | 'provider_5xx' | 'non_json' | 'schema_error' | 'unknown' | null;
  repair_attempted: boolean;
  latency_ms: number;
};

export type ContextAssemblyResult = {
  assembled_context: string;
  missing_context: string[];
  token_count: number;
  truncation_applied: boolean;
};

export type ValidationErrorEnvelope = {
  code: string;
  message: string;
  retryable: boolean;
  details?: unknown;
};

export type PromptRunRecord = {
  id?: string;
  workspace_id: string;
  prompt_id: string;
  prompt_version: string;
  provider_used: string;
  fallback_used: boolean;
  fallback_reason: string | null;
  attempt_count: number;
  provider_chain: string[];
  failure_classification: 'timeout' | 'provider_5xx' | 'non_json' | 'schema_error' | 'unknown' | null;
  repair_attempted: boolean;
  latency_ms: number;
  input_json: Record<string, unknown>;
  output_json: Record<string, unknown>;
  validation_status: 'pass' | 'fail';
  error_code: string | null;
};

export type TicketDraft = {
  title: string;
  description: string;
  acceptance_criteria: string[];
  story_points: number;
  dependencies: string[];
};

export type DecisionRecord = {
  id: string;
  statement: string;
  rationale: string;
  date: string;
  author: string;
  sources: Citation[];
};

export type DigestItem = {
  severity: 'low' | 'medium' | 'high';
  summary: string;
  action: string;
  linked_entities: string[];
  citations: Citation[];
};

export type AnalyticsEventName =
  | 'landing_view'
  | 'landing_cta_click'
  | 'landing_scroll_depth'
  | 'landing_sample_view';

export type AnalyticsEventInput = {
  event: AnalyticsEventName;
  payload?: Record<string, unknown>;
  timestamp?: string;
  workspace_id?: string;
  user_id?: string;
  session_id?: string;
  path?: string;
  user_agent?: string;
};
