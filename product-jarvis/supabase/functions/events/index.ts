import { body } from '../_shared/http.ts';
import { jsonWithCors, errorWithCors, handleCors } from '../_shared/cors.ts';
import { logAnalyticsEvent } from '../_shared/storage.ts';
import type { AnalyticsEventInput } from '../_shared/types.ts';

const ALLOWED_EVENTS = new Set([
  'landing_view',
  'landing_cta_click',
  'landing_scroll_depth',
  'landing_sample_view',
]);

type EventRequest = AnalyticsEventInput & { event: string };

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'POST') return errorWithCors(request, 'Method not allowed', 405, 'METHOD_NOT_ALLOWED');

  try {
    const incoming = await body<EventRequest>(request);
    const eventName = String(incoming.event || '').trim();

    if (!ALLOWED_EVENTS.has(eventName)) {
      return errorWithCors(request, `Unsupported event: ${eventName}`, 400, 'INVALID_EVENT');
    }

    if (incoming.timestamp) {
      const parsedTs = new Date(incoming.timestamp);
      if (Number.isNaN(parsedTs.getTime())) {
        return errorWithCors(request, 'timestamp must be a valid ISO datetime', 400, 'INVALID_TIMESTAMP');
      }
    }

    const workspaceId = incoming.workspace_id || request.headers.get('x-workspace-id') || null;
    const event = await logAnalyticsEvent({
      workspace_id: workspaceId,
      user_id: incoming.user_id || null,
      session_id: incoming.session_id || null,
      event_name: eventName,
      payload_json: incoming.payload || {},
      path: incoming.path || new URL(request.url).pathname,
      user_agent: incoming.user_agent || request.headers.get('user-agent') || null,
    });

    return jsonWithCors(request, { accepted: true, event_id: event.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String(err.message) : 'Failed to ingest event';
    return errorWithCors(request, message, 400, 'EVENT_INGEST_FAILED');
  }
});
