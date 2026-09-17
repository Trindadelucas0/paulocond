import { test } from "node:test";
import assert from "node:assert/strict";
import {
  filtrarUnidades,
  ratearPorFracao,
  somaFracao,
  UNIDADES_FRACAO,
} from "../lib/fracao-ideal";

test("136 unidades, fração da 101 e soma ≈ 1", () => {
  assert.equal(UNIDADES_FRACAO.length, 136);
  const u101 = UNIDADES_FRACAO.find((u) => u.codigo === "101");
  assert.ok(u101);
  assert.equal(u101.fracao, 0.008357);
  const vaga = UNIDADES_FRACAO.find((u) => u.codigo === "V055");
  assert.ok(vaga);
  assert.ok(Math.abs(somaFracao() - 1) < 1e-6);
});

test("rateio: soma igual ao total e 101 = round(T × fração)", () => {
  const total = 100_000_00;
  const linhas = ratearPorFracao(total);
  assert.equal(linhas.length, 136);
  assert.equal(
    linhas.reduce((acc, l) => acc + l.valorCents, 0),
    total,
  );
  const u101 = linhas.find((l) => l.codigo === "101");
  assert.ok(u101);
  assert.equal(u101.valorCents, Math.round(total * 0.008357));
});

test("filtro por código ignora maiúsculas e vazio devolve tudo", () => {
  const linhas = ratearPorFracao(10_000_00);
  assert.equal(filtrarUnidades(linhas, "").length, 136);
  assert.equal(filtrarUnidades(linhas, "101").map((l) => l.codigo).join(","), "101");
  assert.equal(filtrarUnidades(linhas, "v055")[0]?.codigo, "V055");
  assert.equal(filtrarUnidades(linhas, "055")[0]?.codigo, "V055");
  assert.equal(filtrarUnidades(linhas, "zzzz").length, 0);
});
