import { z } from "zod";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, ApiError, condominioDoCodigo } from "@/lib/tenant";
import { origemPermitida } from "@/lib/auth/origem";
import { ipDoPedido, limiteLogin } from "@/lib/auth/rate-limit";
import { verificarSenha } from "@/lib/auth/senha";
import {
  COOKIE_SESSAO,
  SESSAO_DIAS,
  cookieSessaoOpcoes,
  hashToken,
  montarCookieValor,
  novoTokenSessao,
  perfilPublico,
  serializarCookie,
} from "@/lib/auth/sessao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().trim().email(),
  senha: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    if (!origemPermitida(request)) {
      throw new ApiError(403, "ORIGEM_INVALIDA", "Origem da requisição não permitida.");
    }
    const limite = limiteLogin(ipDoPedido(request));
    if (!limite.ok) {
      return Response.json(
        {
          success: false,
          error: { code: "RATE_LIMIT", message: "Muitas tentativas. Aguarde um minuto." },
        },
        { status: 429, headers: { "Retry-After": String(limite.retryAfterSec) } },
      );
    }

    const body = schema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      throw new ApiError(401, "CREDENCIAL_INVALIDA", "E-mail ou senha inválidos.");
    }

    const email = body.data.email.toLowerCase();
    const condominio = await condominioDoCodigo();
    const usuario = await prisma.usuario.findFirst({
      where: { condominioId: condominio.id, email },
      include: { condominio: { select: { id: true, nome: true, codigo: true } } },
    });

    const ok = await verificarSenha(body.data.senha, usuario?.senhaHash ?? null);
    if (!ok || !usuario?.ativo) {
      throw new ApiError(401, "CREDENCIAL_INVALIDA", "E-mail ou senha inválidos.");
    }

    const token = novoTokenSessao();
    const expiraEm = new Date(Date.now() + SESSAO_DIAS * 24 * 60 * 60 * 1000);
    await prisma.sessao.create({
      data: {
        usuarioId: usuario.id,
        tokenHash: hashToken(token),
        expiraEm,
      },
    });

    const response = Response.json({
      success: true,
      data: perfilPublico({
        sessaoId: "",
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          papel: usuario.papel,
          ativo: usuario.ativo,
          condominioId: usuario.condominioId,
        },
        condominio: usuario.condominio,
      }),
    });
    response.headers.append(
      "Set-Cookie",
      serializarCookie(COOKIE_SESSAO, montarCookieValor(token), cookieSessaoOpcoes()),
    );
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
