import { GRUPO_CONTRATOS_FIXOS, GRUPO_IMPOSTOS, GRUPO_MANUTENCAO } from "@/lib/analise-taxa";
import { somaFracao, UNIDADES_FRACAO, type UnidadeFracao } from "@/lib/fracao-ideal";
import { UNIDADES_CONDOMINIO, mediaPorUnidade } from "@/lib/format";
import { INADIMPLENCIA_MEDIA_PERCENTUAL_BP } from "@/lib/inadimplencia";
import type { LancamentoComRel } from "@/lib/kpis";

export const NOME_PRO_LABORE_SINDICO = "Pró Labore do Síndico";
/** Mesma competência excluída da média de cobertura (Set/2026 parcial). */
export const COMPETENCIA_EXCLUIDA_MEDIA = "2026-09";
export const AJUSTE_PCT_MIN = -50;
export const AJUSTE_PCT_MAX = 100;

export type NovaTaxaIdealPayload = {
  contratosFixosMediaCents: number;
  sindicoMediaCents: number;
  manutencaoMediaCents: number;
  impostosMediaCents: number;
  baseCents: number;
  inadimplenciaMarkupBp: number;
  inadimplenciaCents: number;
  valorIdealMensalCents: number;
  porUnidadeCents: number;
  unidades: number;
  mesesComValor: number;
  porFracao: {
    unidades: number;
    somaFracao: number;
    linhas: UnidadeFracao[];
  };
};

export type AnoSimuladoPayload = {
  ajustePct: number;
  contratosSimCents: number;
  impostosSimCents: number;
  sindicoSimCents: number;
  manutencaoSimCents: number;
  baseSimCents: number;
  inadimplenciaSimCents: number;
  taxaSimCents: number;
  porUnidadeSimCents: number;
  vsAtualCents: number;
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

export type NovaTaxaMensalCelula = {
  competencia: string;
  valorCents: number | null;
  residual: boolean;
};

export type NovaTaxaMensalLinhaId =
  | "contratos"
  | "sindico"
  | "manutencao"
  | "inadimplencia"
  | "novo-custo"
  | "media-unidade";

export type NovaTaxaMensalLinha = {
  id: NovaTaxaMensalLinhaId;
  rotulo: string;
  papel: "custo" | "total" | "media";
  porCompetencia: NovaTaxaMensalCelula[];
  mediaCents: number;
  totalCents: number;
};

export type NovaTaxaMensalPayload = {
  competencias: string[];
  linhas: NovaTaxaMensalLinha[];
};

function celulaCompetencia(
  lancamentos: LancamentoComRel[],
  competencia: string,
  inclui: (l: LancamentoComRel) => boolean,
): NovaTaxaMensalCelula {
  let valorCents = 0;
  let residual = false;
  let temDado = false;
  for (const l of lancamentos) {
    if (l.periodo.competencia !== competencia || !inclui(l)) continue;
    temDado = true;
    valorCents += l.valorCents;
    if (l.origemValor === "RESIDUAL_MES_AUSENTE") residual = true;
  }
  return { competencia, valorCents: temDado ? valorCents : null, residual };
}

function somaCelulas(celulas: NovaTaxaMensalCelula[]): number {
  return celulas.reduce((a, c) => a + (c.valorCents ?? 0), 0);
}

function linhaMensal(params: {
  id: NovaTaxaMensalLinhaId;
  rotulo: string;
  papel: NovaTaxaMensalLinha["papel"];
  porCompetencia: NovaTaxaMensalCelula[];
  mediaCents: number;
  ocultarTotal?: boolean;
}): NovaTaxaMensalLinha {
  return {
    id: params.id,
    rotulo: params.rotulo,
    papel: params.papel,
    porCompetencia: params.porCompetencia,
    mediaCents: params.mediaCents,
    totalCents: params.ocultarTotal ? 0 : somaCelulas(params.porCompetencia),
  };
}

/**
 * Série mensal da taxa prevista (mesma composição da taxa ideal, sem Impostos).
 * Células incluem Set/2026. Coluna Média = montarNovaTaxaIdeal.
 */
export function montarNovaTaxaMensal(
  lancamentos: LancamentoComRel[],
  competencias: string[],
  ideal = montarNovaTaxaIdeal(lancamentos),
): NovaTaxaMensalPayload {
  const ehContratoSemSindico = (l: LancamentoComRel) =>
    l.tipo === "DESPESA" &&
    l.categoria.grupo === GRUPO_CONTRATOS_FIXOS &&
    l.categoria.nome !== NOME_PRO_LABORE_SINDICO;
  const ehSindico = (l: LancamentoComRel) => l.tipo === "DESPESA" && l.categoria.nome === NOME_PRO_LABORE_SINDICO;
  const ehManutencao = (l: LancamentoComRel) =>
    l.tipo === "DESPESA" && l.categoria.grupo === GRUPO_MANUTENCAO;

  const contratos = competencias.map((c) => celulaCompetencia(lancamentos, c, ehContratoSemSindico));
  const sindico = competencias.map((c) => celulaCompetencia(lancamentos, c, ehSindico));
  const manutencao = competencias.map((c) => celulaCompetencia(lancamentos, c, ehManutencao));

  const inadimplencia: NovaTaxaMensalCelula[] = competencias.map((competencia, i) => {
    const tem =
      contratos[i].valorCents !== null || sindico[i].valorCents !== null || manutencao[i].valorCents !== null;
    if (!tem) return { competencia, valorCents: null, residual: false };
    const base =
      (contratos[i].valorCents ?? 0) + (sindico[i].valorCents ?? 0) + (manutencao[i].valorCents ?? 0);
    return {
      competencia,
      valorCents: markupBp(base, ideal.inadimplenciaMarkupBp),
      residual: contratos[i].residual || sindico[i].residual || manutencao[i].residual,
    };
  });

  const novoCusto: NovaTaxaMensalCelula[] = competencias.map((competencia, i) => {
    if (inadimplencia[i].valorCents === null) return { competencia, valorCents: null, residual: false };
    const valorCents =
      (contratos[i].valorCents ?? 0) +
      (sindico[i].valorCents ?? 0) +
      (manutencao[i].valorCents ?? 0) +
      (inadimplencia[i].valorCents ?? 0);
    return {
      competencia,
      valorCents,
      residual: inadimplencia[i].residual,
    };
  });

  const mediaUnidade: NovaTaxaMensalCelula[] = novoCusto.map((c) => ({
    competencia: c.competencia,
    valorCents: c.valorCents === null ? null : mediaPorUnidade(c.valorCents, UNIDADES_CONDOMINIO),
    residual: c.residual,
  }));

  return {
    competencias,
    linhas: [
      linhaMensal({
        id: "contratos",
        rotulo: "Contratos fixos (sem pró-labore)",
        papel: "custo",
        porCompetencia: contratos,
        mediaCents: ideal.contratosFixosMediaCents,
      }),
      linhaMensal({
        id: "sindico",
        rotulo: "Síndico (pró-labore)",
        papel: "custo",
        porCompetencia: sindico,
        mediaCents: ideal.sindicoMediaCents,
      }),
      linhaMensal({
        id: "manutencao",
        rotulo: "Manutenção",
        papel: "custo",
        porCompetencia: manutencao,
        mediaCents: ideal.manutencaoMediaCents,
      }),
      linhaMensal({
        id: "inadimplencia",
        rotulo: "Inadimplência 4,56%",
        papel: "custo",
        porCompetencia: inadimplencia,
        mediaCents: ideal.inadimplenciaCents,
      }),
      linhaMensal({
        id: "novo-custo",
        rotulo: "Novo custo",
        papel: "total",
        porCompetencia: novoCusto,
        mediaCents: ideal.valorIdealMensalCents,
      }),
      linhaMensal({
        id: "media-unidade",
        rotulo: "Média por unidade",
        papel: "media",
        porCompetencia: mediaUnidade,
        mediaCents: ideal.porUnidadeCents,
        ocultarTotal: true,
      }),
    ],
  };
}

/** Markup em basis points (456 = 4,56%). */
export function markupBp(baseCents: number, bp: number): number {
  return Math.round((baseCents * bp) / 10_000);
}

export function ajustePctValido(pct: number): boolean {
  return Number.isFinite(pct) && pct >= AJUSTE_PCT_MIN && pct <= AJUSTE_PCT_MAX;
}

/**
 * Ano simulado: o % vale só para Contratos fixos (sem pró-labore) e Impostos.
 * Síndico e manutenção ficam iguais. Markup 4,56% sobre a nova base (inclui impostos).
 */
export function simularAnoTaxa(dados: NovaTaxaIdealPayload, ajustePct: number): AnoSimuladoPayload | null {
  if (!ajustePctValido(ajustePct)) return null;
  const fator = 1 + ajustePct / 100;
  const contratosSimCents = Math.round(dados.contratosFixosMediaCents * fator);
  const impostosSimCents = Math.round(dados.impostosMediaCents * fator);
  const sindicoSimCents = dados.sindicoMediaCents;
  const manutencaoSimCents = dados.manutencaoMediaCents;
  const baseSimCents = contratosSimCents + impostosSimCents + sindicoSimCents + manutencaoSimCents;
  const inadimplenciaSimCents = markupBp(baseSimCents, dados.inadimplenciaMarkupBp);
  const taxaSimCents = baseSimCents + inadimplenciaSimCents;
  return {
    ajustePct,
    contratosSimCents,
    impostosSimCents,
    sindicoSimCents,
    manutencaoSimCents,
    baseSimCents,
    inadimplenciaSimCents,
    taxaSimCents,
    porUnidadeSimCents: mediaPorUnidade(taxaSimCents, dados.unidades),
    vsAtualCents: taxaSimCents - dados.valorIdealMensalCents,
  };
}

/**
 * Taxa ideal mensal do condomínio: média de contratos (sem pró-labore) +
 * média do síndico + média de manutenção + markup de inadimplência 4,56%.
 * Impostos não entram nesta soma (só no ano simulado).
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
  const impostosMediaCents = mediaMesesComValor(
    somarPorCompetencia(
      lancamentos,
      (l) => l.tipo === "DESPESA" && l.categoria.grupo === GRUPO_IMPOSTOS,
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
    impostosMediaCents,
    baseCents,
    inadimplenciaMarkupBp,
    inadimplenciaCents,
    valorIdealMensalCents,
    porUnidadeCents: mediaPorUnidade(valorIdealMensalCents, UNIDADES_CONDOMINIO),
    unidades: UNIDADES_CONDOMINIO,
    mesesComValor: mesesContratos,
    porFracao: {
      unidades: UNIDADES_FRACAO.length,
      somaFracao: somaFracao(UNIDADES_FRACAO),
      linhas: [...UNIDADES_FRACAO],
    },
  };
}
