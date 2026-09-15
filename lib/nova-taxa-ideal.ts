import { GRUPO_CONTRATOS_FIXOS, GRUPO_MANUTENCAO } from "@/lib/analise-taxa";
import { UNIDADES_CONDOMINIO, mediaPorUnidade } from "@/lib/format";
import { INADIMPLENCIA_MEDIA_PERCENTUAL_BP } from "@/lib/inadimplencia";
import type { LancamentoComRel } from "@/lib/kpis";

export const NOME_PRO_LABORE_SINDICO = "Pró Labore do Síndico";
/** Mesma competência excluída da média de cobertura (Set/2026 parcial). */
export const COMPETENCIA_EXCLUIDA_MEDIA = "2026-09";

export type NovaTaxaIdealPayload = {
  contratosFixosMediaCents: number;
  sindicoMediaCents: number;
  manutencaoMediaCents: number;
  baseCents: number;
  inadimplenciaMarkupBp: number;
  inadimplenciaCents: number;
  valorIdealMensalCents: number;
  porUnidadeCents: number;
  unidades: number;
  mesesComValor: number;
};

export function competenciaEntraNaMedia(competencia: string, qualidade?: string): boolean {
  if (competencia === COMPETENCIA_EXCLUIDA_MEDIA) return false;
  if (qualidade === "PARCIAL") return false;
  return true;
}

export function mediaMesesComValor(porCompetencia: ReadonlyMap<string, number>): number {
  const valores = [...porCompetencia.entries()]
    .filter(([competencia, v]) => competenciaEntraNaMedia(competencia) && v !== 0)
    .map(([, v]) => v);
  if (valores.length === 0) return 0;
  return Math.round(valores.reduce((a, b) => a + b, 0) / valores.length);
}

export function somarPorCompetencia(
  lancamentos: LancamentoComRel[],
  inclui: (l: LancamentoComRel) => boolean,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const l of lancamentos) {
    if (!inclui(l)) continue;
    const competencia = l.periodo.competencia;
    if (!competenciaEntraNaMedia(competencia, l.periodo.qualidade)) continue;
    map.set(competencia, (map.get(competencia) ?? 0) + l.valorCents);
  }
  return map;
}

/** Markup em basis points (456 = 4,56%). */
export function markupBp(baseCents: number, bp: number): number {
  return Math.round((baseCents * bp) / 10_000);
}

/**
 * Taxa ideal mensal do condomínio: média de contratos (sem pró-labore) +
 * média do síndico + média de manutenção + markup de inadimplência 4,56%.
 * Pró Labore já está em Contratos fixos — não entra duas vezes.
 */
export function montarNovaTaxaIdeal(lancamentos: LancamentoComRel[]): NovaTaxaIdealPayload {
  const contratosFixosMediaCents = mediaMesesComValor(
    somarPorCompetencia(
      lancamentos,
      (l) =>
        l.tipo === "DESPESA" &&
        l.categoria.grupo === GRUPO_CONTRATOS_FIXOS &&
        l.categoria.nome !== NOME_PRO_LABORE_SINDICO,
    ),
  );
  const sindicoMediaCents = mediaMesesComValor(
    somarPorCompetencia(
      lancamentos,
      (l) => l.tipo === "DESPESA" && l.categoria.nome === NOME_PRO_LABORE_SINDICO,
    ),
  );
  const manutencaoMediaCents = mediaMesesComValor(
    somarPorCompetencia(
      lancamentos,
      (l) => l.tipo === "DESPESA" && l.categoria.grupo === GRUPO_MANUTENCAO,
    ),
  );
  const baseCents = contratosFixosMediaCents + sindicoMediaCents + manutencaoMediaCents;
  const inadimplenciaMarkupBp = INADIMPLENCIA_MEDIA_PERCENTUAL_BP;
  const inadimplenciaCents = markupBp(baseCents, inadimplenciaMarkupBp);
  const valorIdealMensalCents = baseCents + inadimplenciaCents;
  const mesesContratos = [...somarPorCompetencia(
    lancamentos,
    (l) =>
      l.tipo === "DESPESA" &&
      l.categoria.grupo === GRUPO_CONTRATOS_FIXOS &&
      l.categoria.nome !== NOME_PRO_LABORE_SINDICO,
  ).values()].filter((v) => v !== 0).length;

  return {
    contratosFixosMediaCents,
    sindicoMediaCents,
    manutencaoMediaCents,
    baseCents,
    inadimplenciaMarkupBp,
    inadimplenciaCents,
    valorIdealMensalCents,
    porUnidadeCents: mediaPorUnidade(valorIdealMensalCents, UNIDADES_CONDOMINIO),
    unidades: UNIDADES_CONDOMINIO,
    mesesComValor: mesesContratos,
  };
}
