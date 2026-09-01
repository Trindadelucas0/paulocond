import { somaNome } from "@/lib/dataset";
import {
  COMPETENCIAS_JAN_JUL_2025,
  mediaMensalPorUnidade,
  mediaPorUnidade,
  UNIDADES_CONDOMINIO,
  type RecorteId,
} from "@/lib/format";
import type { LancamentoComRel } from "@/lib/kpis";

export type ComparativoConsumoLinha = {
  rotulo: string;
  cents2025: number;
  cents2026: number;
  variacaoPct: number | null;
};

export type ComparativoConsumoBloco = {
  rotulo: string;
  aviso: string | null;
  linhas: ComparativoConsumoLinha[];
};

function variacao(atual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return (atual - anterior) / anterior;
}

function linha(rotulo: string, cents2025: number, cents2026: number): ComparativoConsumoLinha {
  return { rotulo, cents2025, cents2026, variacaoPct: variacao(cents2026, cents2025) };
}

export function avisoComparativoJanJul(recorte: RecorteId): string | null {
  if (recorte === "oficial-2026") {
    return "Aviso: o período oficial 2026 tem 12 competências. O comparativo abaixo usa só Jan–Jul.";
  }
  if (recorte === "oficial-2025") {
    return "Aviso: o recorte 2025 oficial já é Jan–Jul. O lado 2026 desta tela também usa Jan–Jul, não o período cheio Out/25–Set/26.";
  }
  return null;
}

export function totaisConsumoJanJul(jj25: LancamentoComRel[], jj26: LancamentoComRel[]) {
  const agua25 = somaNome(jj25, "Água e Esgoto", "DESPESA");
  const agua26 = somaNome(jj26, "Água e Esgoto", "DESPESA");
  const gas25 = somaNome(jj25, "Gás", "DESPESA");
  const gas26 = somaNome(jj26, "Gás", "DESPESA");
  const solar25 = somaNome(jj25, "Energia Solar", "DESPESA");
  const solar26 = somaNome(jj26, "Energia Solar", "DESPESA");
  const rateioGas25 = somaNome(jj25, "Rateio Gás", "RECEITA");
  const rateioGas26 = somaNome(jj26, "Rateio Gás", "RECEITA");
  const nMeses = COMPETENCIAS_JAN_JUL_2025.length;

  return {
    agua25,
    agua26,
    gas25,
    gas26,
    solar25,
    solar26,
    rateioGas25,
    rateioGas26,
    nMeses,
    gasMedio25: mediaPorUnidade(gas25),
    gasMedio26: mediaPorUnidade(gas26),
    gasMedioMensal25: mediaMensalPorUnidade(gas25, nMeses),
    gasMedioMensal26: mediaMensalPorUnidade(gas26, nMeses),
  };
}

export function montarComparativoConsumo(
  jj25: LancamentoComRel[],
  jj26: LancamentoComRel[],
  opts?: { incluirConferencia?: boolean; avisoRecorte?: string | null },
): ComparativoConsumoBloco {
  const t = totaisConsumoJanJul(jj25, jj26);
  const linhas: ComparativoConsumoLinha[] = [
    linha("Água e Esgoto", t.agua25, t.agua26),
    linha("Gás", t.gas25, t.gas26),
    linha(`Gás médio por unidade (${UNIDADES_CONDOMINIO} un.)`, t.gasMedio25, t.gasMedio26),
    linha("Gás médio mensal por unidade", t.gasMedioMensal25, t.gasMedioMensal26),
    linha("Energia Solar", t.solar25, t.solar26),
  ];

  if (opts?.incluirConferencia) {
    linhas.push(
      linha("Rateio Gás (receita)", t.rateioGas25, t.rateioGas26),
      linha("Gás não rateado (desp. Gás − rateio)", t.gas25 - t.rateioGas25, t.gas26 - t.rateioGas26),
    );
  }

  const avisos: string[] = [];
  if (opts?.avisoRecorte) avisos.push(opts.avisoRecorte);
  avisos.push(
    `Gás médio: divisão igualitária por ${UNIDADES_CONDOMINIO} unidades. Não é medição individual. Copa/Salão de festas fora da base.`,
  );

  return {
    rotulo: "Contas de consumo: Jan–Jul/2025 vs Jan–Jul/2026",
    aviso: avisos.join(" "),
    linhas,
  };
}
