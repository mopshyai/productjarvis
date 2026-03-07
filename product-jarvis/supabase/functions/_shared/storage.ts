import type { ContextAssemblyResult } from './context/types.ts';
import type { MethodologyRunRecord } from './methodologies/types.ts';
import type { PromptRunRecord } from './prompts/types.ts';
import { getSupabaseAdminClient } from './supabaseClient.ts';

const memoryRuns: PromptRunRecord[] = [];
const memoryContextLogs: Array<{
  workspace_id: string;
  request_type: string;
  token_count: number;
  missing_context: string[];
  truncation_applied: boolean;
  created_at: string;
}> = [];
const memoryMethodologyRuns: MethodologyRunRecord[] = [];
const memoryAnalyticsEvents: Array<{
  id: string;
  workspace_id: string | null;
  user_id: string | null;
  session_id: string | null;
  event_name: string;
  payload_json: Record<string, unknown>;
  path: string | null;
  user_agent: string | null;
  created_at: string;
}> = [];

function toUuidOrNull(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed) ? trimmed : null;
}

export async function logPromptRun(run: PromptRunRecord) {
  const withId = { ...run, id: run.id || crypto.randomUUID() };
  memoryRuns.unshift(withId);
  if (memoryRuns.length > 200) {
    memoryRuns.pop();
  }

  const client = getSupabaseAdminClient();
  if (client) {
    try {
      const { data } = await client.from('prompt_runs').insert(run).select('id').single();
      if (data?.id) {
        withId.id = data.id;
      }
    } catch {
      await client.from('prompt_runs').insert({
        workspace_id: run.workspace_id,
        prompt_id: run.prompt_id,
        prompt_version: run.prompt_version,
        provider_used: run.provider_used,
        fallback_used: run.fallback_used,
        fallback_reason: run.fallback_reason,
        latency_ms: run.latency_ms,
        input_json: run.input_json,
        output_json: run.output_json,
        validation_status: run.validation_status,
        error_code: run.error_code,
      });
    }
  }

  return withId;
}

export async function logContextAssembly(workspaceId: string, requestType: string, context: ContextAssemblyResult) {
  const record = {
    workspace_id: workspaceId,
    request_type: requestType,
    token_count: context.token_count,
    missing_context: context.missing_context,
    truncation_applied: context.truncation_applied,
    created_at: new Date().toISOString(),
  };

  memoryContextLogs.unshift(record);
  if (memoryContextLogs.length > 200) {
    memoryContextLogs.pop();
  }

  const client = getSupabaseAdminClient();
  if (client) {
    await client.from('context_assembly_logs').insert(record);
  }

  return record;
}

export async function logMethodologyRun(run: MethodologyRunRecord) {
  memoryMethodologyRuns.unshift(run);
  if (memoryMethodologyRuns.length > 200) {
    memoryMethodologyRuns.pop();
  }

  const client = getSupabaseAdminClient();
  if (client) {
    await client.from('methodology_runs').insert({
      workspace_id: run.workspace_id,
      prompt_run_id: run.prompt_run_id,
      primary_method: run.primary_method,
      supporting_methods: run.supporting_methods,
      selection_reason: run.selection_reason,
      score_payload: run.score_payload,
    });
  }

  return run;
}

export async function logAnalyticsEvent(record: {
  workspace_id: string | null;
  user_id: string | null;
  session_id: string | null;
  event_name: string;
  payload_json: Record<string, unknown>;
  path: string | null;
  user_agent: string | null;
}) {
  const withMeta = {
    id: crypto.randomUUID(),
    ...record,
    workspace_id: toUuidOrNull(record.workspace_id),
    user_id: toUuidOrNull(record.user_id),
    created_at: new Date().toISOString(),
  };

  memoryAnalyticsEvents.unshift(withMeta);
  if (memoryAnalyticsEvents.length > 500) {
    memoryAnalyticsEvents.pop();
  }

  const client = getSupabaseAdminClient();
  if (client) {
    try {
      const { data } = await client
        .from('analytics_events')
        .insert({
          ...record,
          workspace_id: toUuidOrNull(record.workspace_id),
          user_id: toUuidOrNull(record.user_id),
        })
        .select('id, created_at')
        .single();
      if (data?.id) {
        withMeta.id = data.id;
      }
      if (data?.created_at) {
        withMeta.created_at = data.created_at;
      }
    } catch {
      // Best-effort telemetry should never break request flow.
    }
  }

  return withMeta;
}

export function getRecentPromptRuns(limit = 20) {
  return memoryRuns.slice(0, limit);
}

export function getRecentContextLogs(limit = 20) {
  return memoryContextLogs.slice(0, limit);
}

export function getRecentMethodologyRuns(limit = 20) {
  return memoryMethodologyRuns.slice(0, limit);
}

export function getRecentAnalyticsEvents(limit = 20) {
  return memoryAnalyticsEvents.slice(0, limit);
}
