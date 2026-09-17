import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/tenant";
import { PAPEL_ADMIN } from "@/lib/auth/papeis";
import { COOKIE_SESSAO } from "@/lib/auth/cookie";

export { COOKIE_SESSAO, SESSAO_DIAS, cookieSessaoOpcoes } from "@/lib/auth/cookie";

export type SessaoAutenticada = {
  sessaoId: string;
  usuario: {
    id: string;
    nome: string;
    email: string;
    papel: string;
    ativo: boolean;
    condominioId: string;
  };
  condominio: { id: string; nome: string; codigo: string };
};

function authSecret() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new ApiError(500, "AUTH_SECRET_AUSENTE", "Configuração de autenticação ausente.");
  }
  return secret;
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function assinar(token: string) {
  return createHmac("sha256", authSecret()).update(token).digest("base64url");
}

export function montarCookieValor(token: string) {
  return `${token}.${assinar(token)}`;
}

export function lerTokenDoCookie(valor: string | undefined): string | null {
  if (!valor) return null;
  const i = valor.lastIndexOf(".");
  if (i <= 0) return null;
  const token = valor.slice(0, i);
  const sig = valor.slice(i + 1);
  const esperada = assinar(token);
  const a = Buffer.from(sig);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return token;
}

export function novoTokenSessao() {
  return randomBytes(32).toString("base64url");
}

export async function aplicarTenantRls(condominioId: string) {
  await prisma.$executeRaw`SELECT set_config('app.condominio_id', ${condominioId}, false)`;
}

function codigoDeploy() {
  const codigo = process.env.CONDOMINIO_CODIGO?.trim();
  if (!codigo) {
    throw new ApiError(400, "TENANT_AUSENTE", "Condomínio ativo não informado.");
  }
  return codigo;
}

export async function carregarSessao(cookieValor: string | undefined): Promise<SessaoAutenticada | null> {
  const token = lerTokenDoCookie(cookieValor);
  if (!token) return null;
  const tokenHash = hashToken(token);
  const sessao = await prisma.sessao.findFirst({
    where: { tokenHash, expiraEm: { gt: new Date() } },
    include: {
      usuario: {
        include: { condominio: { select: { id: true, nome: true, codigo: true } } },
      },
    },
  });
  if (!sessao || !sessao.usuario.ativo) return null;
  if (sessao.usuario.condominio.codigo !== codigoDeploy()) return null;
  return {
    sessaoId: sessao.id,
    usuario: {
      id: sessao.usuario.id,
      nome: sessao.usuario.nome,
      email: sessao.usuario.email,
      papel: sessao.usuario.papel,
      ativo: sessao.usuario.ativo,
      condominioId: sessao.usuario.condominioId,
    },
    condominio: sessao.usuario.condominio,
  };
}

export async function requireAuth(request: NextRequest): Promise<SessaoAutenticada> {
  const sessao = await carregarSessao(request.cookies.get(COOKIE_SESSAO)?.value);
  if (!sessao) {
    throw new ApiError(401, "NAO_AUTENTICADO", "Faça login para continuar.");
  }
  await aplicarTenantRls(sessao.condominio.id);
  return sessao;
}

export async function requireAdmin(request: NextRequest): Promise<SessaoAutenticada> {
  const sessao = await requireAuth(request);
  if (sessao.usuario.papel !== PAPEL_ADMIN) {
    throw new ApiError(403, "SEM_PERMISSAO", "Apenas administradores podem fazer esta ação.");
  }
  return sessao;
}

export async function sessaoDoServidor(): Promise<SessaoAutenticada | null> {
  const jar = await cookies();
  const sessao = await carregarSessao(jar.get(COOKIE_SESSAO)?.value);
  if (sessao) await aplicarTenantRls(sessao.condominio.id);
  return sessao;
}

export function serializarCookie(
  name: string,
  value: string,
  opts: { httpOnly: boolean; sameSite: "lax"; secure: boolean; path: string; maxAge: number },
) {
  const parts = [`${name}=${value}`, `Path=${opts.path}`, `Max-Age=${opts.maxAge}`, "SameSite=Lax"];
  if (opts.httpOnly) parts.push("HttpOnly");
  if (opts.secure) parts.push("Secure");
  return parts.join("; ");
}

export function perfilPublico(sessao: SessaoAutenticada) {
  return {
    id: sessao.usuario.id,
    nome: sessao.usuario.nome,
    email: sessao.usuario.email,
    papel: sessao.usuario.papel,
    condominio: sessao.condominio,
  };
}

