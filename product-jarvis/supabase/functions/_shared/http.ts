export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export async function body<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

export function error(message: string, status = 400, code = 'BAD_REQUEST'): Response {
  return json(
    {
      error: {
        code,
        message,
      },
    },
    status
  );
}
