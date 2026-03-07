import { jsonWithCors, errorWithCors, handleCors } from '../_shared/cors.ts';
import { getOnboardingSchema } from '../_shared/authStore.ts';

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'GET') return errorWithCors(request, 'Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  return jsonWithCors(request, getOnboardingSchema());
});
