import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COMPETENCIA_EXCLUIDA_MEDIA,
  markupBp,
  mediaMesesComValor,
  montarNovaTaxaIdeal,
  NOME_PRO_LABORE_SINDICO,
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
});
