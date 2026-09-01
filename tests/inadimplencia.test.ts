import { test } from "node:test";
import assert from "node:assert/strict";
import { formatPercentualBp } from "../lib/format";
import {
  INADIMPLENCIA_MEDIA_PERCENTUAL_BP,
  INADIMPLENCIA_MESES,
  montarInadimplencia,
} from "../lib/inadimplencia";

test("inadimplência: 12 meses Set/25–Ago/26 e média 4,56%", () => {
  const r = montarInadimplencia();
  assert.equal(r.meses.length, 12);
  assert.equal(r.meses[0]?.competencia, "2025-09");
  assert.equal(r.ultimo.competencia, "2026-08");
  assert.equal(r.ultimo.valorCents, 1_363_663);
  assert.equal(r.ultimo.percentualBp, 292);
  assert.equal(r.pico.competencia, "2026-01");
  assert.equal(r.pico.valorCents, 1_873_830);
  assert.equal(r.mediaPercentualBp, 456);
  assert.equal(formatPercentualBp(r.mediaPercentualBp), "4,56%");
  assert.equal(formatPercentualBp(r.ultimo.percentualBp), "2,92%");
  assert.equal(formatPercentualBp(584), "5,84%");
});

test("inadimplência: média informada = arredondamento da média dos 12 percentuais", () => {
  const soma = INADIMPLENCIA_MESES.reduce((acc, m) => acc + m.percentualBp, 0);
  assert.equal(Math.round(soma / INADIMPLENCIA_MESES.length), INADIMPLENCIA_MEDIA_PERCENTUAL_BP);
});

test("inadimplência: não soma os valores em R$ no acumulado", () => {
  const r = montarInadimplencia();
  const somaValores = r.meses.reduce((acc, m) => acc + m.valorCents, 0);
  assert.notEqual(r.mediaPercentualBp, somaValores);
  assert.ok(somaValores > 10_000_000);
});
