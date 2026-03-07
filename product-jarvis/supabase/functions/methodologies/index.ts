import { jsonWithCors, errorWithCors, handleCors } from '../_shared/cors.ts';
import { getMethodologyCatalog } from '../_shared/methodologies/registry.ts';

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'GET') return errorWithCors(request, 'Method not allowed', 405, 'METHOD_NOT_ALLOWED');

  const catalog = await getMethodologyCatalog();
  return jsonWithCors(request, {
    version: 'v1',
    total: catalog.length,
    categories: [...new Set(catalog.map((method) => method.category))],
    methodologies: catalog,
  });
});
