import { body } from '../_shared/http.ts';
import { jsonWithCors, errorWithCors, handleCors } from '../_shared/cors.ts';
import { getMethodologyById } from '../_shared/methodologies/registry.ts';
import { selectMethodologies } from '../_shared/methodologies/selector.ts';
import type { MethodologyRequest } from '../_shared/methodologies/types.ts';

type ValidateInput = {
  prompt_id: string;
  methodology_request?: MethodologyRequest;
  input?: Record<string, unknown>;
};

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'POST') return errorWithCors(request, 'Method not allowed', 405, 'METHOD_NOT_ALLOWED');

  try {
    const payload = await body<ValidateInput>(request);
    const baseInput = payload.input || {};
    const selected = await selectMethodologies(payload.prompt_id || 'prd_generation', payload.methodology_request, baseInput);

    const knownPrimary = await getMethodologyById(selected.primary);
    if (!knownPrimary) {
      return errorWithCors(request, `Unknown primary methodology: ${selected.primary}`, 400, 'UNKNOWN_METHODOLOGY');
    }

    const unknownSupporting: string[] = [];
    for (const method of selected.supporting) {
      const found = await getMethodologyById(method);
      if (!found) unknownSupporting.push(method);
    }

    return jsonWithCors(request, {
      valid: unknownSupporting.length === 0,
      methodology_applied: {
        primary: selected.primary,
        supporting: selected.supporting,
        selection_reason: selected.selection_reason,
      },
      missing_inputs: selected.missing_inputs,
      warnings: [...selected.warnings, ...(unknownSupporting.length ? [`Unknown supporting methodologies: ${unknownSupporting.join(', ')}`] : [])],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String(err.message) : 'Methodology validation failed';
    return errorWithCors(request, message, 400, 'METHODOLOGY_VALIDATION_FAILED');
  }
});
