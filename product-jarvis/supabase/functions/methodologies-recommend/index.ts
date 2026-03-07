import { body } from '../_shared/http.ts';
import { jsonWithCors, errorWithCors, handleCors } from '../_shared/cors.ts';
import { recommendMethodologies } from '../_shared/authStore.ts';

type Payload = {
  role?: string;
  stage?: string;
  cadence?: string;
};

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'POST') return errorWithCors(request, 'Method not allowed', 405, 'METHOD_NOT_ALLOWED');

  const payload = await body<Payload>(request);
  const recommendation = recommendMethodologies(payload);
  return jsonWithCors(request, recommendation);
});
