/**
 * Série informada de inadimplência (saldo em atraso no fim de cada mês).
 * Não vem do demonstrativo de receitas e despesas. Igual em todos os recortes.
 * O percentual acumulado 4,56% é a média aritmética dos 12 meses, arredondada —
 * não é soma dos valores em R$ (cada linha é posição de estoque, não fluxo).
 */

export type MesInadimplencia = {
  competencia: string;
  rotulo: string;
  valorCents: number;
  percentualBp: number;
};

export type InadimplenciaPayload = {
  rotuloPeriodo: string;
  meses: MesInadimplencia[];
  ultimo: MesInadimplencia;
  pico: MesInadimplencia;
  mediaPercentualBp: number;
  nota: string;
};

/** 584 = 5,84%. */
export const INADIMPLENCIA_MESES: readonly MesInadimplencia[] = [
  { competencia: "2025-09", rotulo: "30/set", valorCents: 1_244_036, percentualBp: 584 },
  { competencia: "2025-10", rotulo: "31/out", valorCents: 900_398, percentualBp: 511 },
  { competencia: "2025-11", rotulo: "30/nov", valorCents: 1_377_985, percentualBp: 511 },
  { competencia: "2025-12", rotulo: "31/dez", valorCents: 1_191_132, percentualBp: 511 },
  { competencia: "2026-01", rotulo: "31/jan", valorCents: 1_873_830, percentualBp: 511 },
  { competencia: "2026-02", rotulo: "28/fev", valorCents: 890_491, percentualBp: 438 },
  { competencia: "2026-03", rotulo: "31/mar", valorCents: 921_434, percentualBp: 438 },
  { competencia: "2026-04", rotulo: "30/abr", valorCents: 993_665, percentualBp: 511 },
  { competencia: "2026-05", rotulo: "31/mai", valorCents: 1_231_408, percentualBp: 438 },
  { competencia: "2026-06", rotulo: "30/jun", valorCents: 1_285_093, percentualBp: 438 },
  { competencia: "2026-07", rotulo: "31/jul", valorCents: 1_342_866, percentualBp: 292 },
  { competencia: "2026-08", rotulo: "31/ago", valorCents: 1_363_663, percentualBp: 292 },
];

/** Média informada na tabela (4,56%). Coincide com o arredondamento da média dos 12 percentuais. */
export const INADIMPLENCIA_MEDIA_PERCENTUAL_BP = 456;

export const INADIMPLENCIA_NOTA =
  "Posição de saldo em atraso no fim de cada mês. Valor informado; não vem do demonstrativo de receitas e despesas. O percentual acumulado é a média dos 12 meses, não a soma dos valores.";

export function montarInadimplencia(): InadimplenciaPayload {
  const meses = INADIMPLENCIA_MESES.map((m) => ({ ...m }));
  const ultimo = meses[meses.length - 1];
  if (!ultimo) {
    throw new Error("Série de inadimplência vazia.");
  }
  const pico = meses.reduce((acc, mes) => (mes.valorCents > acc.valorCents ? mes : acc));
  return {
    rotuloPeriodo: "Set/2025 a Ago/2026",
    meses,
    ultimo,
    pico,
    mediaPercentualBp: INADIMPLENCIA_MEDIA_PERCENTUAL_BP,
    nota: INADIMPLENCIA_NOTA,
  };
}
