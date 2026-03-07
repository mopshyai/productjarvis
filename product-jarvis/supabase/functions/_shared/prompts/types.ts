export type PromptId =
  | 'prd_generation'
  | 'ticket_factory'
  | 'decision_detection'
  | 'daily_digest'
  | 'command_router'
  | 'prd_health'
  | 'stakeholder_update'
  | 'opportunities_synthesize'
  | 'methodology_reasoning';

export type ModelPolicy = {
  primary: 'claude';
  fallback: 'openai_compatible';
};

export type PromptConfig = {
  id: PromptId;
  version: string;
  templatePath: string;
  schemaPath: string;
  maxContextTokens: number;
  modelPolicy: ModelPolicy;
};

export type PromptExecutionInput<T> = {
  workspaceId: string;
  promptId: PromptId;
  input: T;
  requestId?: string;
  promptVersion?: string;
};

export type PromptExecutionResult<T> = {
  data: T;
  providerUsed: string;
  fallbackUsed: boolean;
  fallbackReason: string | null;
  attemptCount: number;
  providerChain: string[];
  failureClassification: 'timeout' | 'provider_5xx' | 'non_json' | 'schema_error' | 'unknown' | null;
  repairAttempted: boolean;
  latencyMs: number;
  promptVersion: string;
};

export type ValidationErrorEnvelope = {
  code: 'VALIDATION_ERROR' | 'INVALID_JSON' | 'LLM_ERROR' | 'MISSING_CONTEXT';
  message: string;
  retryable: boolean;
  details?: unknown;
};

export type PromptRunRecord = {
  id?: string;
  workspace_id: string;
  prompt_id: PromptId;
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
