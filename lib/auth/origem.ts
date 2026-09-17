export function origemPermitida(request: Request): boolean {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
