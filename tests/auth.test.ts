import { test } from "node:test";
import assert from "node:assert/strict";
import { bloqueiaUltimoAdmin, PAPEL_ADMIN, PAPEL_LEITURA, podeTrocarSenha, podeVerConfig } from "../lib/auth/papeis";
import { origemPermitida } from "../lib/auth/origem";
import { hashSenha, verificarSenha, senhaMinimaOk } from "../lib/auth/senha";

test("senha mínima 10 caracteres", () => {
  assert.equal(senhaMinimaOk("123456789"), false);
  assert.equal(senhaMinimaOk("1234567890"), true);
});

test("hash e verificação de senha", async () => {
  const hash = await hashSenha("senha-secreta-ok");
  assert.equal(await verificarSenha("senha-secreta-ok", hash), true);
  assert.equal(await verificarSenha("outra", hash), false);
  assert.equal(await verificarSenha("senha-secreta-ok", null), false);
});

test("não remove o último admin ativo", () => {
  assert.equal(
    bloqueiaUltimoAdmin({
      alvoEhAdminAtivo: true,
      adminsAtivos: 1,
      novoAtivo: false,
    }),
    true,
  );
  assert.equal(
    bloqueiaUltimoAdmin({
      alvoEhAdminAtivo: true,
      adminsAtivos: 1,
      novoPapel: PAPEL_LEITURA,
    }),
    true,
  );
  assert.equal(
    bloqueiaUltimoAdmin({
      alvoEhAdminAtivo: true,
      adminsAtivos: 2,
      novoAtivo: false,
    }),
    false,
  );
  assert.equal(
    bloqueiaUltimoAdmin({
      alvoEhAdminAtivo: false,
      adminsAtivos: 1,
      novoAtivo: false,
    }),
    false,
  );
  assert.equal(PAPEL_ADMIN, "ADMIN");
});

test("LEITURA não vê config nem troca senha", () => {
  assert.equal(podeVerConfig(PAPEL_ADMIN), true);
  assert.equal(podeTrocarSenha(PAPEL_ADMIN), true);
  assert.equal(podeVerConfig(PAPEL_LEITURA), false);
  assert.equal(podeTrocarSenha(PAPEL_LEITURA), false);
});

test("origem da mutação precisa bater com Host", () => {
  const ok = new Request("http://localhost:3789/api/auth/login", {
    method: "POST",
    headers: { origin: "http://localhost:3789", host: "localhost:3789" },
  });
  assert.equal(origemPermitida(ok), true);
  const ruim = new Request("http://localhost:3789/api/auth/login", {
    method: "POST",
    headers: { origin: "http://evil.example", host: "localhost:3789" },
  });
  assert.equal(origemPermitida(ruim), false);
  const semOrigin = new Request("http://localhost:3789/api/auth/login", {
    method: "POST",
    headers: { host: "localhost:3789" },
  });
  assert.equal(origemPermitida(semOrigin), false);
  const get = new Request("http://localhost:3789/api/visao-geral", { method: "GET" });
  assert.equal(origemPermitida(get), true);
});

test("cookie Secure só com AUTH_COOKIE_SECURE=true", async () => {
  const prev = process.env.AUTH_COOKIE_SECURE;
  const { cookieSessaoOpcoes } = await import("../lib/auth/cookie.ts");
  process.env.AUTH_COOKIE_SECURE = "false";
  assert.equal(cookieSessaoOpcoes().secure, false);
  process.env.AUTH_COOKIE_SECURE = "true";
  assert.equal(cookieSessaoOpcoes().secure, true);
  if (prev === undefined) delete process.env.AUTH_COOKIE_SECURE;
  else process.env.AUTH_COOKIE_SECURE = prev;
});
