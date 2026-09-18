/** API 路由的响应小工具。 */

export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  });
}

export function error(message: string, status: number): Response {
  return json({ error: message }, status);
}

export const TOKEN_HEADER = "x-report-token";
