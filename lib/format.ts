export const RECORTE_IDS = [
  "oficial-2026",
  "oficial-2025",
  "equivalente-jan-jul",
] as const;

export type RecorteId = (typeof RECORTE_IDS)[number];

export const KPI_IDS = ["saldo", "receitas", "despesas", "resultado"] as const;
export type KpiId = (typeof KPI_IDS)[number];

export function isRecorteId(value: string): value is RecorteId {
  return (RECORTE_IDS as readonly string[]).includes(value);
}

export function isKpiId(value: string): value is KpiId {
  return (KPI_IDS as readonly string[]).includes(value);
}

export const RECORTE_OPCOES: { id: RecorteId; label: string }[] = [
  { id: "oficial-2026", label: "Out/25 – Set/26" },
  { id: "equivalente-jan-jul", label: "Jan–Jul/26 vs 25" },
  { id: "oficial-2025", label: "Jan–Jul/25" },
];

export const MODULO_IDS = [
  "receitas",
  "despesas",
  "fluxo",
  "taxa-condominial",
  "fundo-reserva",
  "taxas-extras",
  "contratos",
  "utilidades",
  "manutencao",
  "patrimonio",
  "comparativo",
  "analise-mensal",
  "detalhamento",
  "alertas",
  "relatorio",
  "configuracoes",
] as const;

export type ModuloId = (typeof MODULO_IDS)[number];

export function isModuloId(value: string): value is ModuloId {
  return (MODULO_IDS as readonly string[]).includes(value);
}

export const ORDEM_IDS = ["valor", "nome"] as const;
export type OrdemId = (typeof ORDEM_IDS)[number];

export function isOrdemId(value: string): value is OrdemId {
  return (ORDEM_IDS as readonly string[]).includes(value);
}

export const COMPETENCIAS_JAN_JUL_2025 = [
  "2025-01",
  "2025-02",
  "2025-03",
  "2025-04",
  "2025-05",
  "2025-06",
  "2025-07",
] as const;

export const COMPETENCIAS_JAN_JUL_2026 = [
  "2026-01",
  "2026-02",
  "2026-03",
  "2026-04",
  "2026-05",
  "2026-06",
  "2026-07",
] as const;

export function mesLabel(competencia: string): string {
  const [ano, mes] = competencia.split("-");
  const nomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const idx = Number(mes) - 1;
  return `${nomes[idx] ?? mes}/${ano.slice(2)}`;
}

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function formatPct(ratio: number | null, digits = 1): string {
  if (ratio === null || !Number.isFinite(ratio)) return "—";
  const pct = ratio * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(digits)}%`;
}

export function formatNumero(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
