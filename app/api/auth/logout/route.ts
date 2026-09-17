export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, jsonError } from "@/lib/tenant";
import { origemPermitida } from "@/lib/auth/origem";
import {
  COOKIE_SESSAO,
  carregarSessao,
  cookieSessaoOpcoes,
  serializarCookie,
} from "@/lib/auth/sessao";

export async function POST(request: NextRequest) {
  try {
    if (!origemPermitida(request)) {
      throw new ApiError(403, "ORIGEM_INVALIDA", "Origem da requisição não permitida.");
    }
    const sessao = await carregarSessao(request.cookies.get(COOKIE_SESSAO)?.value);
    if (sessao) {
      await prisma.sessao.deleteMany({ where: { id: sessao.sessaoId } });
    }
    const response = Response.json({ success: true });
    response.headers.append(
      "Set-Cookie",
      serializarCookie(COOKIE_SESSAO, "", { ...cookieSessaoOpcoes(), maxAge: 0 }),
    );
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
