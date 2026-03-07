import { body } from '../_shared/http.ts';
import { jsonWithCors, errorWithCors, handleCors } from '../_shared/cors.ts';
import { getSupabaseAdminClient } from '../_shared/supabaseClient.ts';

type Payload = {
  version: string;
  change_summary: string;
  activate?: boolean;
};

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'POST') return errorWithCors(request, 'Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  const adminToken = request.headers.get('x-admin-token');
  if (!adminToken) return errorWithCors(request, 'admin token required', 403, 'FORBIDDEN');

  const payload = await body<Payload>(request);
  if (!payload.version || !payload.change_summary) {
    return errorWithCors(request, 'version and change_summary are required', 400, 'MISSING_PARAMS');
  }

  const client = getSupabaseAdminClient();
  if (!client) {
    return jsonWithCors(request, {
      version: payload.version,
      active: Boolean(payload.activate),
      persisted: false,
      message: 'Supabase credentials not configured; dry-run only.',
    });
  }

  if (payload.activate) {
    await client.from('methodology_registry_versions').update({ active: false }).neq('version', payload.version);
  }

  await client.from('methodology_registry_versions').upsert(
    {
      version: payload.version,
      change_summary: payload.change_summary,
      active: Boolean(payload.activate),
    },
    { onConflict: 'version' }
  );

  return jsonWithCors(request, {
    version: payload.version,
    active: Boolean(payload.activate),
    persisted: true,
  });
});
