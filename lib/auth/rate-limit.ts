type Bucket = { vezes: number; resetEm: number };

const buckets = new Map<string, Bucket>();
const JANELA_MS = 60_000;
const MAX = 5;

export function limiteLogin(chave: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const agora = Date.now();
  const atual = buckets.get(chave);
  if (!atual || atual.resetEm <= agora) {
    buckets.set(chave, { vezes: 1, resetEm: agora + JANELA_MS });
    return { ok: true };
  }
  if (atual.vezes >= MAX) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((atual.resetEm - agora) / 1000)) };
  }
  atual.vezes += 1;
  return { ok: true };
}

export function ipDoPedido(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "desconhecido";
  return request.headers.get("x-real-ip") ?? "desconhecido";
}
