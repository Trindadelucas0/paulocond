import { test } from "node:test";
import assert from "node:assert/strict";
import { montarAnaliseTaxa } from "../lib/analise-taxa";
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

test("análise da taxa: cotas − contratos − impostos − manutenção + acordo = resultado 3", () => {
  const lancamentos = [
    lancamento({ nome: "Cotas de Condomínio", tipo: "RECEITA", valorCents: 100_000_00, grupo: "Cotas ordinárias" }),
    lancamento({ nome: "Empresa Terceirizada", tipo: "DESPESA", valorCents: 40_000_00, grupo: "Contratos fixos" }),
    lancamento({ nome: "Pró Labore do Síndico", tipo: "DESPESA", valorCents: 10_000_00, grupo: "Contratos fixos" }),
    lancamento({ nome: "DARF", tipo: "DESPESA", valorCents: 10_000_00, grupo: "Impostos" }),
    lancamento({ nome: "Elevador", tipo: "DESPESA", valorCents: 20_000_00, grupo: "Manutenção" }),
    lancamento({ nome: "Cotas de Acordo", tipo: "RECEITA", valorCents: 5_000_00, grupo: "RECEITAS EVENTUAIS" }),
    lancamento({ nome: "Água e Esgoto", tipo: "DESPESA", valorCents: 99_000_00, grupo: "Tarifas públicas" }),
  ];
  const r = montarAnaliseTaxa(lancamentos);
  assert.equal(r.taxaCents, 100_000_00);
  assert.equal(r.contratosCents, 50_000_00);
  assert.equal(r.impostosCents, 10_000_00);
  assert.equal(r.resultado1Cents, 40_000_00);
  assert.equal(r.manutencoesCents, 20_000_00);
  assert.equal(r.resultado2Cents, 20_000_00);
  assert.equal(r.cotasAcordoCents, 5_000_00);
  assert.equal(r.resultado3Cents, 25_000_00);
  assert.equal(r.linhas[0].rotulo, "Cotas de Condomínio");
  assert.equal(r.linhas[1].rotulo, "(−) Contratos fixos");
  assert.equal(r.linhas[2].id, "impostos");
});

test("análise da taxa: tarifas públicas não entram no demonstrativo (não é cobertura)", () => {
  const r = montarAnaliseTaxa([
    lancamento({ nome: "Cotas de Condomínio", tipo: "RECEITA", valorCents: 80_000_00, grupo: "Cotas ordinárias" }),
    lancamento({ nome: "Água e Esgoto", tipo: "DESPESA", valorCents: 70_000_00, grupo: "Tarifas públicas" }),
  ]);
  assert.equal(r.contratosCents, 0);
  assert.equal(r.impostosCents, 0);
  assert.equal(r.manutencoesCents, 0);
  assert.equal(r.resultado3Cents, 80_000_00);
});
