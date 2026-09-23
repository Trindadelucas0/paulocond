export const TIPOS = ["PREVENTIVA", "CORRETIVA"] as const;
export const PRIORIDADES = ["BAIXA", "NORMAL", "ALTA", "URGENTE"] as const;
export const STATUS_MANUTENCAO = ["pendente", "em_andamento", "concluida", "cancelada"] as const;
export const DEPARTAMENTOS = ["ZELADORIA", "LIMPEZA"] as const;

export type StatusManutencao = (typeof STATUS_MANUTENCAO)[number];

const TRANSICOES: Record<StatusManutencao, StatusManutencao[]> = {
  pendente: ["em_andamento", "cancelada"],
  em_andamento: ["concluida", "cancelada"],
  concluida: [],
  cancelada: [],
};

export function statusFinal(status: string) {
  return status === "concluida" || status === "cancelada";
}

export function podeTransitar(de: string, para: string) {
  if (!STATUS_MANUTENCAO.includes(de as StatusManutencao)) return false;
  return TRANSICOES[de as StatusManutencao].includes(para as StatusManutencao);
}

export function reaisParaCents(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const bruto = String(valor).trim();
  const texto = bruto.includes(",") ? bruto.replace(/\./g, "").replace(",", ".") : bruto;
  const numero = Number(texto);
  if (!Number.isFinite(numero) || numero < 0 || numero > 9_999_999) {
    throw new Error("Custo inválido.");
  }
  return Math.round(numero * 100);
}

export function centsParaReais(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function diaDaSemana(isoDate: string) {
  const [ano, mes, dia] = isoDate.split("-").map(Number);
  if (!ano || !mes || !dia) return null;
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
}

export function dataIsoValida(valor: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor) && diaDaSemana(valor) !== null;
}

export type ItemFechamento = {
  status: string;
  comentario: string | null;
  exigeFoto: boolean;
  fotos: number;
};

export function podeFinalizarChecklist(itens: ItemFechamento[], exigeJustificativa: boolean, exigeFotoModelo: boolean) {
  if (itens.length === 0) return "O checklist não tem itens.";
  for (const item of itens) {
    if (item.status === "PENDING") return "Marque todos os itens antes de finalizar.";
    if (item.status === "NOT_DONE" && exigeJustificativa && !item.comentario?.trim()) {
      return "Item não feito precisa de justificativa.";
    }
    const exige = item.exigeFoto || exigeFotoModelo;
    if (item.status === "DONE" && exige && item.fotos < 1) {
      return "Este item exige foto.";
    }
  }
  return null;
}
