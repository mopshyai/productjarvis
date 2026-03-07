const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://productjarvis.com',
  'https://www.productjarvis.com',
  'https://app.productjarvis.com',
];

function isVercelPreview(origin: string): boolean {
  return /^https:\/\/[\w-]+-[\w-]+\.vercel\.app$/.test(origin)
    || /^https:\/\/product-jarvis[\w-]*\.vercel\.app$/.test(origin);
}

function getAllowedOrigin(request: Request): string {
  const origin = request.headers.get('origin') || '';
  const envOrigins = Deno.env.get('CORS_ALLOWED_ORIGINS');
  const allowed = envOrigins ? envOrigins.split(',').map((o) => o.trim()) : ALLOWED_ORIGINS;

  if (allowed.includes(origin)) return origin;
  if (allowed.includes('*')) return '*';
  if (isVercelPreview(origin)) return origin;
  return allowed[0] || '';
}

export function corsHeaders(request: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(request),
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-workspace-id, x-oauth-state, x-client-info, apikey',
    'Access-Control-Max-Age': '86400',
  };
}

export function handleCors(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request),
    });
  }
  return null;
}

export function jsonWithCors(request: Request, data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...corsHeaders(request),
    },
  });
}

export function errorWithCors(request: Request, message: string, status = 400, code = 'BAD_REQUEST'): Response {
  return jsonWithCors(request, { error: { code, message } }, status);
}
