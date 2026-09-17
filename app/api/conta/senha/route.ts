export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { z } from "zod";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, jsonError } from "@/lib/tenant";
import { origemPermitida } from "@/lib/auth/origem";
import { hashSenha, verificarSenha, SENHA_MINIMA } from "@/lib/auth/senha";
import { requireAdmin } from "@/lib/auth/sessao";

const schema = z.object({
  senhaAtual: z.string().min(1),
  senhaNova: z.string().min(SENHA_MINIMA),
});

export async function PATCH(request: NextRequest) {
  try {
    if (!origemPermitida(request)) {
      throw new ApiError(403, "ORIGEM_INVALIDA", "Origem da requisição não permitida.");
    }
    const sessao = await requireAdmin(request);
    const body = schema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      throw new ApiError(400, "VALIDACAO", `A nova senha precisa ter no mínimo ${SENHA_MINIMA} caracteres.`);
    }
    const usuario = await prisma.usuario.findFirst({
      where: { id: sessao.usuario.id, condominioId: sessao.condominio.id },
    });
    if (!usuario) {
      throw new ApiError(404, "NAO_ENCONTRADO", "Usuário não encontrado.");
    }
    const ok = await verificarSenha(body.data.senhaAtual, usuario.senhaHash);
    if (!ok) {
      throw new ApiError(401, "CREDENCIAL_INVALIDA", "Senha atual incorreta.");
    }
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { senhaHash: await hashSenha(body.data.senhaNova) },
    });
    await prisma.sessao.deleteMany({
      where: { usuarioId: usuario.id, id: { not: sessao.sessaoId } },
    });
    return Response.json({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
