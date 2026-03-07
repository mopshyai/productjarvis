import { assembleContext, assembleContextEnriched } from './context/assembler.ts';
import { classifyLlmError, type FailureClassification } from './llm/provider.ts';
import { runFallback, runPrimary, runWithFallback, type RoutedLlmOutput } from './llm/router.ts';
import { resolveMethodologyBundle } from './methodologies/service.ts';
import { getPromptConfig, getPromptSchema, getPromptTemplate } from './prompts/registry.ts';
import type { PromptExecutionInput, PromptExecutionResult } from './prompts/types.ts';
import { renderTemplate } from './template.ts';
import { normalizeCitations } from './validation/citationValidator.ts';
import { parseStrictJson } from './validation/responseGuards.ts';
import { validateRequiredKeys } from './validation/schemaValidator.ts';
import { logContextAssembly, logMethodologyRun, logPromptRun } from './storage.ts';

export async function executePrompt<T extends Record<string, unknown>>(
  input: PromptExecutionInput<Record<string, unknown>>
): Promise<PromptExecutionResult<T>> {
  const startedAt = Date.now();
  const cfg = getPromptConfig(input.promptId);
  const promptVersion = input.promptVersion || cfg.version;

  const contextResult = await assembleContextEnriched(input.workspaceId, {
    product_context: (input.input.product_context as Record<string, unknown>) || {},
    maxTokens: cfg.maxContextTokens,
  });
  await logContextAssembly(input.workspaceId, input.promptId, contextResult);

  const template = await getPromptTemplate(input.promptId);
  const schema = await getPromptSchema(input.promptId);
  const methodologyBundle = await resolveMethodologyBundle(
    input.promptId,
    input.input,
    (input.input.methodology_request as { mode?: 'auto' | 'manual' } | undefined)
  );

  const finalPrompt = renderTemplate(template, {
    ...input.input,
    assembled_context: contextResult.assembled_context,
    methodology_applied: methodologyBundle.applied,
    methodology_outputs: methodologyBundle.outputs,
    now_iso: new Date().toISOString(),
  });

  let routed: RoutedLlmOutput;
  try {
    routed = await runWithFallback({
      promptId: input.promptId,
      prompt: finalPrompt,
      responseSchemaRequiredKeys: schema.required,
    });
  } catch (routerError) {
    const failureClassification = classifyLlmError(routerError);
    const latencyMs = Date.now() - startedAt;
    const promptRun = await logPromptRun({
      workspace_id: input.workspaceId,
      prompt_id: input.promptId,
      prompt_version: promptVersion,
      provider_used: 'claude',
      fallback_used: false,
      fallback_reason: null,
      attempt_count: 1,
      provider_chain: ['claude'],
      failure_classification: failureClassification,
      repair_attempted: false,
      latency_ms: latencyMs,
      input_json: input.input,
      output_json: {},
      validation_status: 'fail',
      error_code: 'LLM_ERROR',
    });
    await logMethodologyRun({
      workspace_id: input.workspaceId,
      prompt_run_id: promptRun.id || null,
      primary_method: methodologyBundle.applied.primary,
      supporting_methods: methodologyBundle.applied.supporting,
      selection_reason: methodologyBundle.applied.selection_reason,
      score_payload: methodologyBundle.outputs,
    });
    throw {
      code: 'LLM_ERROR',
      message: routerError instanceof Error ? routerError.message : 'Model execution failed',
      retryable: true,
      details: {
        failure_classification: failureClassification,
        provider_chain: ['claude', 'openai_compatible'],
      },
    };
  }

  let providerUsed = routed.output.provider;
  let fallbackUsed = routed.fallbackUsed;
  let fallbackReason = routed.fallbackReason;
  let attemptCount = routed.attemptCount;
  const providerChain = [...routed.providerChain];
  let failureClassification: FailureClassification | null = routed.failureClassification;
  let repairAttempted = false;
  let parsed: Record<string, unknown>;

  try {
    try {
      parsed = parseStrictJson(routed.output.rawText);
      validateRequiredKeys(parsed, schema.required);
    } catch (validationError) {
      const validationCode =
        validationError &&
        typeof validationError === 'object' &&
        'code' in validationError &&
        typeof (validationError as { code?: unknown }).code === 'string'
          ? String((validationError as { code: string }).code)
          : '';

      if (validationCode !== 'INVALID_JSON') {
        failureClassification = 'schema_error';
        throw validationError;
      }

      repairAttempted = true;
      failureClassification = 'non_json';
      const repairPrompt = `Return ONLY JSON object with required keys: ${schema.required.join(', ')}. Input: ${routed.output.rawText}`;

      try {
        const repairPrimary = await runPrimary({
          promptId: input.promptId,
          prompt: repairPrompt,
          responseSchemaRequiredKeys: schema.required,
        });
        attemptCount += 1;
        providerUsed = repairPrimary.provider;
        providerChain.push(repairPrimary.provider);
        parsed = parseStrictJson(repairPrimary.rawText);
        validateRequiredKeys(parsed, schema.required);
      } catch (repairPrimaryError) {
        const repairPrimaryClassification = classifyLlmError(repairPrimaryError);
        if (repairPrimaryClassification === 'timeout' || repairPrimaryClassification === 'provider_5xx') {
          failureClassification = repairPrimaryClassification;
        } else {
          failureClassification = 'non_json';
        }

        const repairFallback = await runFallback({
          promptId: input.promptId,
          prompt: repairPrompt,
          responseSchemaRequiredKeys: schema.required,
        });
        attemptCount += 1;
        providerUsed = repairFallback.provider;
        providerChain.push(repairFallback.provider);
        fallbackUsed = true;
        fallbackReason = failureClassification === 'non_json' ? 'non_json_after_repair' : 'primary_repair_failed';

        parsed = parseStrictJson(repairFallback.rawText);
        validateRequiredKeys(parsed, schema.required);
      }
    }
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const promptRun = await logPromptRun({
      workspace_id: input.workspaceId,
      prompt_id: input.promptId,
      prompt_version: promptVersion,
      provider_used: providerUsed,
      fallback_used: fallbackUsed,
      fallback_reason: fallbackReason,
      attempt_count: attemptCount,
      provider_chain: providerChain,
      failure_classification: failureClassification,
      repair_attempted: repairAttempted,
      latency_ms: latencyMs,
      input_json: input.input,
      output_json: {},
      validation_status: 'fail',
      error_code:
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code: string }).code)
          : error instanceof Error
            ? error.message
            : 'VALIDATION_FAILURE',
    });
    await logMethodologyRun({
      workspace_id: input.workspaceId,
      prompt_run_id: promptRun.id || null,
      primary_method: methodologyBundle.applied.primary,
      supporting_methods: methodologyBundle.applied.supporting,
      selection_reason: methodologyBundle.applied.selection_reason,
      score_payload: methodologyBundle.outputs,
    });
    throw error;
  }

  if ('citations' in parsed) {
    parsed.citations = normalizeCitations(parsed.citations);
  }

  parsed.methodology_applied = parsed.methodology_applied || methodologyBundle.applied;
  parsed.methodology_outputs = parsed.methodology_outputs || methodologyBundle.outputs;

  const latencyMs = Date.now() - startedAt;

  const promptRun = await logPromptRun({
    workspace_id: input.workspaceId,
    prompt_id: input.promptId,
    prompt_version: promptVersion,
    provider_used: providerUsed,
    fallback_used: fallbackUsed,
    fallback_reason: fallbackReason,
    attempt_count: attemptCount,
    provider_chain: providerChain,
    failure_classification: failureClassification,
    repair_attempted: repairAttempted,
    latency_ms: latencyMs,
    input_json: input.input,
    output_json: parsed,
    validation_status: 'pass',
    error_code: null,
  });
  await logMethodologyRun({
    workspace_id: input.workspaceId,
    prompt_run_id: promptRun.id || null,
    primary_method: methodologyBundle.applied.primary,
    supporting_methods: methodologyBundle.applied.supporting,
    selection_reason: methodologyBundle.applied.selection_reason,
    score_payload: methodologyBundle.outputs,
  });

  return {
    data: parsed as T,
    providerUsed,
    fallbackUsed,
    fallbackReason,
    attemptCount,
    providerChain,
    failureClassification,
    repairAttempted,
    latencyMs,
    promptVersion,
  };
}
