import { after, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { withinTolerance, SALDO_INICIAL_CENTS } from "../lib/money";

after(async () => {
  await prisma.$disconnect();
});

const ESPERADO = {
  PLANILHA_2026: {
    receita: 146_380_571,
    despesa: 131_777_836,
    resultado: 14_602_735,
    saldoFinal: 35_123_901,
    saldoInicial: SALDO_INICIAL_CENTS,
  },
  PLANILHA_2025: {
    receita: 80_831_568,
    despesa: 78_409_981,
    resultado: 2_421_587,
    saldoFinal: 19_669_303,
    saldoInicial: SALDO_INICIAL_CENTS,
  },
};

test("totais oficiais iguais à coluna B", async () => {
  const condominio = await prisma.condominio.findFirst({ where: { codigo: "132" } });
  assert.ok(condominio, "condomínio 132 ausente — rode npm run importar");

  for (const origem of ["PLANILHA_2026", "PLANILHA_2025"] as const) {
    const oficial = await prisma.totalOficial.findFirst({
      where: { condominioId: condominio.id, origem },
    });
    assert.ok(oficial, `${origem} sem total oficial`);
    const exp = ESPERADO[origem];
    assert.equal(withinTolerance(oficial.receitaCents, exp.receita), true, `${origem} receita`);
    assert.equal(withinTolerance(oficial.despesaCents, exp.despesa), true, `${origem} despesa`);
    assert.equal(withinTolerance(oficial.resultadoCents, exp.resultado), true, `${origem} resultado`);
    assert.equal(withinTolerance(oficial.saldoFinalCents, exp.saldoFinal), true, `${origem} saldo final`);
    assert.equal(withinTolerance(oficial.saldoInicialCents, exp.saldoInicial), true, `${origem} saldo inicial`);
  }
});

test("soma dos lançamentos (meses + residual) bate com a coluna B", async () => {
  const condominio = await prisma.condominio.findFirst({ where: { codigo: "132" } });
  assert.ok(condominio);

  for (const origem of ["PLANILHA_2026", "PLANILHA_2025"] as const) {
    const oficial = await prisma.totalOficial.findFirst({
      where: { condominioId: condominio.id, origem },
    });
    assert.ok(oficial);
    const lancamentos = await prisma.lancamento.findMany({
      where: { condominioId: condominio.id, origem },
    });
    const rec = lancamentos.filter((l) => l.tipo === "RECEITA").reduce((a, l) => a + l.valorCents, 0);
    const des = lancamentos.filter((l) => l.tipo === "DESPESA").reduce((a, l) => a + l.valorCents, 0);
    assert.equal(withinTolerance(rec, oficial.receitaCents), true, `${origem} soma receita`);
    assert.equal(withinTolerance(des, oficial.despesaCents), true, `${origem} soma despesa`);
  }
});

test("mês residual existe e Out/2025 ou Jan/2025 está marcado", async () => {
  const condominio = await prisma.condominio.findFirst({ where: { codigo: "132" } });
  assert.ok(condominio);

  const out = await prisma.periodo.findFirst({
    where: { condominioId: condominio.id, competencia: "2025-10", origem: "PLANILHA_2026" },
  });
  const jan = await prisma.periodo.findFirst({
    where: { condominioId: condominio.id, competencia: "2025-01", origem: "PLANILHA_2025" },
  });
  assert.equal(out?.qualidade, "RESIDUAL_MES_AUSENTE");
  assert.equal(jan?.qualidade, "RESIDUAL_MES_AUSENTE");

  const residual2026 = await prisma.lancamento.aggregate({
    where: {
      condominioId: condominio.id,
      origem: "PLANILHA_2026",
      origemValor: "RESIDUAL_MES_AUSENTE",
      tipo: "RECEITA",
    },
    _sum: { valorCents: true },
  });
  assert.equal(withinTolerance(residual2026._sum.valorCents ?? 0, 12_509_332), true);
});
