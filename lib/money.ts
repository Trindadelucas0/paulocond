/**
 * Valores financeiros em centavos (inteiro) para não perder precisão.
 * Confirmado: planilhas usam texto brasileiro `1.463.805,71`.
 */

/** Saldo inicial do sistema: sempre R$ 0,00. A linha "Saldo anterior" da planilha não alimenta KPI, waterfall nem relatório. */
export const SALDO_INICIAL_CENTS = 0;

const BR_MONEY = /^-?\d{1,3}(\.\d{3})*,\d{2}$/;
const BR_MONEY_SHORT = /^-?\d+,\d{2}$/;

export function parseBrToCents(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return Math.round(value * 100);
  }
  const raw = String(value).replace("R$", "").trim();
  if (raw === "" || raw === "-") return null;
  const negative = raw.startsWith("-") || raw.startsWith("(");
  const cleaned = raw.replace(/[()\s]/g, "").replace(/^-/, "");
  if (!BR_MONEY.test(raw.replace(/^-/, "")) && !BR_MONEY_SHORT.test(raw.replace(/^-/, ""))) {
    const fallback = cleaned.replace(/\./g, "").replace(",", ".");
    const n = Number(fallback);
    if (!Number.isFinite(n)) return null;
    const cents = Math.round(n * 100);
    return negative ? -cents : cents;
  }
  const n = Number(cleaned.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n)) return null;
  const cents = Math.round(n * 100);
  return negative ? -cents : cents;
}

export function centsToNumber(cents: number): number {
  return cents / 100;
}

export function absCents(cents: number): number {
  return Math.abs(cents);
}

export function withinTolerance(a: number, b: number, tolCents = 1): boolean {
  return Math.abs(a - b) <= tolCents;
}

export function sumCents(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}
