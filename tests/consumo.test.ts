import { after, test } from "node:test";
import assert from "node:assert/strict";
import { janJul } from "../lib/dataset";
import { mediaMensalPorUnidade, mediaPorUnidade, UNIDADES_CONDOMINIO } from "../lib/format";
import { montarComparativoConsumo, totaisConsumoJanJul } from "../lib/consumo";
import { prisma } from "../lib/prisma";

after(async () => {
  await prisma.$disconnect();
});

test("gás Jan–Jul exclui copa/salão e rateia por 124 unidades", async () => {
  const condominio = await prisma.condominio.findFirst({ where: { codigo: "132" } });
  assert.ok(condominio, "condomínio 132 ausente — rode npm run importar");

  const lancamentos = await prisma.lancamento.findMany({
    where: { condominioId: condominio.id },
    include: { categoria: true, periodo: true },
  });

  const jj25 = janJul(lancamentos, 2025);
  const jj26 = janJul(lancamentos, 2026);
  const t = totaisConsumoJanJul(jj25, jj26);

  assert.equal(t.gas25, 2_396_390);
  assert.equal(t.gas26, 3_149_849);
  assert.equal(t.agua25, 10_785_379);
  assert.equal(t.agua26, 12_280_847);
  assert.equal(t.solar25, 6_900_270);
  assert.equal(t.solar26, 8_311_295);

  const copa = lancamentos
    .filter(
      (l) =>
        l.categoria.nome === "Gás para Copa - Salão de Festas" &&
        l.tipo === "DESPESA" &&
        l.periodo.competencia.startsWith("2026-"),
    )
    .reduce((a, l) => a + l.valorCents, 0);
  assert.equal(copa, 13_000);
  assert.notEqual(t.gas26, t.gas26 + copa);

  assert.equal(mediaPorUnidade(t.gas25), 19_326);
  assert.equal(mediaPorUnidade(t.gas26), 25_402);
  assert.equal(mediaMensalPorUnidade(t.gas25, t.nMeses), 2_761);
  assert.equal(mediaMensalPorUnidade(t.gas26, t.nMeses), 3_629);
  assert.equal(UNIDADES_CONDOMINIO, 124);

  const bloco = montarComparativoConsumo(jj25, jj26, { incluirConferencia: true });
  assert.equal(bloco.linhas.length, 7);
  assert.ok(bloco.linhas.some((l) => l.rotulo.includes("124 un.")));
  assert.ok(bloco.aviso?.includes("124"));
});
