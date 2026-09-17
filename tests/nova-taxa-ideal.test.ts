import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COMPETENCIA_EXCLUIDA_MEDIA,
  markupBp,
  mediaMesesComValor,
  montarNovaTaxaIdeal,
  montarNovaTaxaMensal,
  NOME_PRO_LABORE_SINDICO,
  simularAnoTaxa,
} from "../lib/nova-taxa-ideal";
import { INADIMPLENCIA_MEDIA_PERCENTUAL_BP } from "../lib/inadimplencia";
import { UNIDADES_CONDOMINIO } from "../lib/format";
import type { LancamentoComRel } from "../lib/kpis";

function lancamento(partial: {
  nome: string;
  tipo: "RECEITA" | "DESPESA";
  valorCents: number;
  grupo?: string;
  competencia: string;
  qualidade?: string;
}): LancamentoComRel {
  return {
    id: partial.competencia + partial.nome,
    condominioId: "c",
    periodoId: partial.competencia,
    categoriaId: partial.nome,
    tipo: partial.tipo,
    valorCents: partial.valorCents,
    status: "REGISTRADO",
    origem: "PLANILHA_2026",
    origemValor: "COLUNA_MES",
    linhaPlanilha: 1,
    arquivo: "test.xlsx",
    rotuloCru: partial.nome,
    categoria: {
      id: partial.nome,
      condominioId: "c",
      slug: "slug",
      nome: partial.nome,
      tipo: partial.tipo,
      grupo: partial.grupo ?? "Grupo",
      natureza: "ORDINARIA",
    },
    periodo: {
      id: partial.competencia,
      condominioId: "c",
      competencia: partial.competencia,
      origem: "PLANILHA_2026",
      saldoAnteriorCents: null,
      saldoFinalCents: null,
      movimentoLiquidoCents: null,
      qualidade: partial.qualidade ?? "COMPLETO",
    },
  };
}

test("média ignora mês zerado e Set/2026", () => {
  const map = new Map<string, number>([
    ["2026-07", 100],
    ["2026-08", 0],
    [COMPETENCIA_EXCLUIDA_MEDIA, 999],
    ["2026-06", 200],
  ]);
  assert.equal(mediaMesesComValor(map), 150);
});

test("markup 4,56% em basis points", () => {
  assert.equal(INADIMPLENCIA_MEDIA_PERCENTUAL_BP, 456);
  assert.equal(markupBp(10_000_00, 456), 456_00);
});

test("nova taxa: pró-labore não é somado duas vezes e Set/2026 fica fora", () => {
  const lancamentos = [
    lancamento({
      nome: "Empresa Terceirizada",
      tipo: "DESPESA",
      valorCents: 80_000_00,
      grupo: "Contratos fixos",
      competencia: "2026-01",
    }),
    lancamento({
      nome: NOME_PRO_LABORE_SINDICO,
      tipo: "DESPESA",
      valorCents: 20_000_00,
      grupo: "Contratos fixos",
      competencia: "2026-01",
    }),
    lancamento({
      nome: "Elevador",
      tipo: "DESPESA",
      valorCents: 10_000_00,
      grupo: "Manutenção",
      competencia: "2026-01",
    }),
    lancamento({
      nome: "Empresa Terceirizada",
      tipo: "DESPESA",
      valorCents: 80_000_00,
      grupo: "Contratos fixos",
      competencia: "2026-09",
      qualidade: "PARCIAL",
    }),
    lancamento({
      nome: NOME_PRO_LABORE_SINDICO,
      tipo: "DESPESA",
      valorCents: 99_000_00,
      grupo: "Contratos fixos",
      competencia: "2026-09",
      qualidade: "PARCIAL",
    }),
    lancamento({
      nome: "Elevador",
      tipo: "DESPESA",
      valorCents: 99_000_00,
      grupo: "Manutenção",
      competencia: "2026-09",
      qualidade: "PARCIAL",
    }),
  ];
  const r = montarNovaTaxaIdeal(lancamentos);
  assert.equal(r.contratosFixosMediaCents, 80_000_00);
  assert.equal(r.sindicoMediaCents, 20_000_00);
  assert.equal(r.manutencaoMediaCents, 10_000_00);
  assert.equal(r.baseCents, 110_000_00);
  assert.equal(r.inadimplenciaMarkupBp, 456);
  assert.equal(r.inadimplenciaCents, markupBp(110_000_00, 456));
  assert.equal(r.valorIdealMensalCents, r.baseCents + r.inadimplenciaCents);
  assert.equal(r.unidades, UNIDADES_CONDOMINIO);
  assert.equal(r.unidades, 124);
  assert.equal(r.porUnidadeCents, Math.round(r.valorIdealMensalCents / 124));
  assert.equal(r.impostosMediaCents, 0);
  assert.equal(r.porFracao.unidades, 136);
});

test("média de Impostos não entra na taxa ideal atual", () => {
  const lancamentos = [
    lancamento({
      nome: "Empresa Terceirizada",
      tipo: "DESPESA",
      valorCents: 80_000_00,
      grupo: "Contratos fixos",
      competencia: "2026-01",
    }),
    lancamento({
      nome: NOME_PRO_LABORE_SINDICO,
      tipo: "DESPESA",
      valorCents: 20_000_00,
      grupo: "Contratos fixos",
      competencia: "2026-01",
    }),
    lancamento({
      nome: "Elevador",
      tipo: "DESPESA",
      valorCents: 10_000_00,
      grupo: "Manutenção",
      competencia: "2026-01",
    }),
    lancamento({
      nome: "DARF",
      tipo: "DESPESA",
      valorCents: 5_000_00,
      grupo: "Impostos",
      competencia: "2026-01",
    }),
  ];
  const r = montarNovaTaxaIdeal(lancamentos);
  assert.equal(r.impostosMediaCents, 5_000_00);
  assert.equal(r.baseCents, 110_000_00);
  assert.equal(r.valorIdealMensalCents, r.baseCents + r.inadimplenciaCents);
});

test("simular ano: +10% e −5% só em contratos e impostos", () => {
  const base = montarNovaTaxaIdeal([
    lancamento({
      nome: "Empresa Terceirizada",
      tipo: "DESPESA",
      valorCents: 80_000_00,
      grupo: "Contratos fixos",
      competencia: "2026-01",
    }),
    lancamento({
      nome: NOME_PRO_LABORE_SINDICO,
      tipo: "DESPESA",
      valorCents: 20_000_00,
      grupo: "Contratos fixos",
      competencia: "2026-01",
    }),
    lancamento({
      nome: "Elevador",
      tipo: "DESPESA",
      valorCents: 10_000_00,
      grupo: "Manutenção",
      competencia: "2026-01",
    }),
    lancamento({
      nome: "DARF",
      tipo: "DESPESA",
      valorCents: 5_000_00,
      grupo: "Impostos",
      competencia: "2026-01",
    }),
  ]);
  const mais = simularAnoTaxa(base, 10);
  assert.ok(mais);
  assert.equal(mais.contratosSimCents, Math.round(80_000_00 * 1.1));
  assert.equal(mais.impostosSimCents, Math.round(5_000_00 * 1.1));
  assert.equal(mais.sindicoSimCents, 20_000_00);
  assert.equal(mais.manutencaoSimCents, 10_000_00);
  assert.equal(
    mais.baseSimCents,
    mais.contratosSimCents + mais.impostosSimCents + mais.sindicoSimCents + mais.manutencaoSimCents,
  );
  assert.equal(mais.inadimplenciaSimCents, markupBp(mais.baseSimCents, 456));
  assert.ok(mais.taxaSimCents > base.valorIdealMensalCents);

  const menos = simularAnoTaxa(base, -5);
  assert.ok(menos);
  assert.equal(menos.contratosSimCents, Math.round(80_000_00 * 0.95));
  assert.equal(menos.impostosSimCents, Math.round(5_000_00 * 0.95));
  assert.equal(menos.sindicoSimCents, 20_000_00);

  const zero = simularAnoTaxa(base, 0);
  assert.ok(zero);
  assert.equal(zero.contratosSimCents, 80_000_00);
  assert.equal(zero.impostosSimCents, 5_000_00);
  assert.ok(zero.taxaSimCents > base.valorIdealMensalCents);

  assert.equal(simularAnoTaxa(base, -51), null);
  assert.equal(simularAnoTaxa(base, 101), null);
  assert.equal(simularAnoTaxa(base, Number.NaN), null);
});

test("série mensal: células incluem Set/2026; coluna Média = taxa ideal; pró-labore não duplica", () => {
  const lancamentos = [
    lancamento({
      nome: "Empresa Terceirizada",
      tipo: "DESPESA",
      valorCents: 80_000_00,
      grupo: "Contratos fixos",
      competencia: "2026-01",
    }),
    lancamento({
      nome: NOME_PRO_LABORE_SINDICO,
      tipo: "DESPESA",
      valorCents: 20_000_00,
      grupo: "Contratos fixos",
      competencia: "2026-01",
    }),
    lancamento({
      nome: "Elevador",
      tipo: "DESPESA",
      valorCents: 10_000_00,
      grupo: "Manutenção",
      competencia: "2026-01",
    }),
    lancamento({
      nome: "Empresa Terceirizada",
      tipo: "DESPESA",
      valorCents: 40_000_00,
      grupo: "Contratos fixos",
      competencia: "2026-02",
    }),
    lancamento({
      nome: NOME_PRO_LABORE_SINDICO,
      tipo: "DESPESA",
      valorCents: 20_000_00,
      grupo: "Contratos fixos",
      competencia: "2026-02",
    }),
    lancamento({
      nome: "Elevador",
      tipo: "DESPESA",
      valorCents: 10_000_00,
      grupo: "Manutenção",
      competencia: "2026-02",
    }),
    lancamento({
      nome: "DARF",
      tipo: "DESPESA",
      valorCents: 5_000_00,
      grupo: "Impostos",
      competencia: "2026-01",
    }),
    lancamento({
      nome: "Empresa Terceirizada",
      tipo: "DESPESA",
      valorCents: 99_000_00,
      grupo: "Contratos fixos",
      competencia: COMPETENCIA_EXCLUIDA_MEDIA,
      qualidade: "PARCIAL",
    }),
  ];
  const ideal = montarNovaTaxaIdeal(lancamentos);
  const mensal = montarNovaTaxaMensal(lancamentos, ["2026-01", "2026-02", COMPETENCIA_EXCLUIDA_MEDIA], ideal);
  const contratos = mensal.linhas.find((l) => l.id === "contratos");
  const sindico = mensal.linhas.find((l) => l.id === "sindico");
  const novo = mensal.linhas.find((l) => l.id === "novo-custo");
  const media = mensal.linhas.find((l) => l.id === "media-unidade");
  assert.ok(contratos && sindico && novo && media);
  assert.equal(contratos.porCompetencia[0].valorCents, 80_000_00);
  assert.equal(contratos.porCompetencia[1].valorCents, 40_000_00);
  assert.equal(contratos.porCompetencia[2].valorCents, 99_000_00);
  assert.equal(sindico.porCompetencia[0].valorCents, 20_000_00);
  assert.equal(contratos.mediaCents, ideal.contratosFixosMediaCents);
  assert.equal(novo.mediaCents, ideal.valorIdealMensalCents);
  assert.equal(media.mediaCents, ideal.porUnidadeCents);
  assert.equal(media.totalCents, 0);
  const janBase = 80_000_00 + 20_000_00 + 10_000_00;
  assert.equal(novo.porCompetencia[0].valorCents, janBase + markupBp(janBase, 456));
  assert.ok((novo.porCompetencia[0].valorCents ?? 0) !== janBase + 5_000_00 + markupBp(janBase + 5_000_00, 456));
});
