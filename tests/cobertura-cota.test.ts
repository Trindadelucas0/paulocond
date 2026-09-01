import { test } from "node:test";
import assert from "node:assert/strict";
import { montarCoberturaCota } from "../lib/cobertura-cota";
import { SALDO_INICIAL_CENTS } from "../lib/money";
import type { LancamentoComRel } from "../lib/kpis";

function lancamento(partial: {
  nome: string;
  tipo: "RECEITA" | "DESPESA";
  valorCents: number;
  grupo?: string;
}): LancamentoComRel {
  return {
    id: "x",
    condominioId: "c",
    periodoId: "p",
    categoriaId: "cat",
    tipo: partial.tipo,
    valorCents: partial.valorCents,
    status: "REGISTRADO",
    origem: "PLANILHA_2026",
    origemValor: "COLUNA_MES",
    linhaPlanilha: 1,
    arquivo: "test.xlsx",
    rotuloCru: partial.nome,
    categoria: {
      id: "cat",
      condominioId: "c",
      slug: "slug",
      nome: partial.nome,
      tipo: partial.tipo,
      grupo: partial.grupo ?? "Grupo",
      natureza: "ORDINARIA",
    },
    periodo: {
      id: "p",
      condominioId: "c",
      competencia: "2026-01",
      origem: "PLANILHA_2026",
      saldoAnteriorCents: null,
      saldoFinalCents: null,
      movimentoLiquidoCents: null,
      qualidade: "COMPLETO",
    },
  };
}

test("cobertura: cotas + saldo 0 − despesa = sobrou", () => {
  const lancamentos = [
    lancamento({ nome: "Cotas de Condomínio", tipo: "RECEITA", valorCents: 844_066_00 }),
    lancamento({ nome: "Empresa Terceirizada", tipo: "DESPESA", valorCents: 500_000_00 }),
    lancamento({ nome: "Água e Esgoto", tipo: "DESPESA", valorCents: 317_778_36 }),
  ];
  const receita = 1_463_805_71;
  const despesa = 1_317_778_36;
  const r = montarCoberturaCota({ lancamentos, receitaCents: receita, despesaCents: despesa });

  assert.equal(r.saldoEntradaCents, SALDO_INICIAL_CENTS);
  assert.equal(r.saldoEntradaCents, 0);
  assert.equal(r.cotasCents, 844_066_00);
  assert.equal(r.disponivelCents, r.cotasCents);
  assert.equal(r.despesaCents, despesa);
  assert.equal(r.sobrouCents, r.cotasCents - despesa);
  assert.equal(r.cobriu, r.sobrouCents >= 0);
  assert.equal(r.outrasReceitasCents, receita - r.cotasCents);
  assert.equal(r.resultadoGeralCents, receita - despesa);
});

test("cobertura: quando cota cobre despesa, cobriu é true", () => {
  const lancamentos = [
    lancamento({ nome: "Cotas de Condomínio", tipo: "RECEITA", valorCents: 200_000_00 }),
    lancamento({ nome: "Água", tipo: "DESPESA", valorCents: 150_000_00 }),
  ];
  const r = montarCoberturaCota({
    lancamentos,
    receitaCents: 200_000_00,
    despesaCents: 150_000_00,
  });
  assert.equal(r.cobriu, true);
  assert.equal(r.sobrouCents, 50_000_00);
});

test("cobertura: quando cota não cobre, cobriu é false", () => {
  const lancamentos = [
    lancamento({ nome: "Cotas de Condomínio", tipo: "RECEITA", valorCents: 100_000_00 }),
    lancamento({ nome: "Água", tipo: "DESPESA", valorCents: 200_000_00 }),
  ];
  const r = montarCoberturaCota({
    lancamentos,
    receitaCents: 300_000_00,
    despesaCents: 200_000_00,
  });
  assert.equal(r.cobriu, false);
  assert.equal(r.sobrouCents, -100_000_00);
});
