export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { z } from "zod";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, jsonError } from "@/lib/tenant";
import { origemPermitida } from "@/lib/auth/origem";
import { PAPEL_ADMIN, bloqueiaUltimoAdmin } from "@/lib/auth/papeis";
import { hashSenha, SENHA_MINIMA } from "@/lib/auth/senha";
import { requireAdmin } from "@/lib/auth/sessao";

const patchSchema = z.object({
  ativo: z.boolean().optional(),
  papel: z.enum(["ADMIN", "LEITURA"]).optional(),
  senha: z.string().min(SENHA_MINIMA).optional(),
  nome: z.string().trim().min(2).max(80).optional(),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    if (!origemPermitida(request)) {
      throw new ApiError(403, "ORIGEM_INVALIDA", "Origem da requisição não permitida.");
    }
    const sessao = await requireAdmin(request);
    const { id } = await context.params;
    const body = patchSchema.safeParse(await request.json().catch(() => null));
    if (!body.success || Object.keys(body.data).length === 0) {
      throw new ApiError(400, "VALIDACAO", "Nada para atualizar.");
    }

    const alvo = await prisma.usuario.findFirst({
      where: { id, condominioId: sessao.condominio.id },
    });
    if (!alvo) {
      throw new ApiError(404, "NAO_ENCONTRADO", "Usuário não encontrado.");
    }

    const adminsAtivos = await prisma.usuario.count({
      where: { condominioId: sessao.condominio.id, papel: PAPEL_ADMIN, ativo: true },
    });
    if (
      bloqueiaUltimoAdmin({
        alvoEhAdminAtivo: alvo.papel === PAPEL_ADMIN && alvo.ativo,
        adminsAtivos,
        novoAtivo: body.data.ativo,
        novoPapel: body.data.papel,
      })
    ) {
      throw new ApiError(400, "ULTIMO_ADMIN", "Não é possível desativar ou rebaixar o último admin.");
    }

    const data: {
      ativo?: boolean;
      papel?: string;
      senhaHash?: string;
      nome?: string;
    } = {};
    if (body.data.ativo !== undefined) data.ativo = body.data.ativo;
    if (body.data.papel !== undefined) data.papel = body.data.papel;
    if (body.data.nome !== undefined) data.nome = body.data.nome;
    if (body.data.senha !== undefined) data.senhaHash = await hashSenha(body.data.senha);

    const atualizado = await prisma.usuario.update({
      where: { id: alvo.id },
      data,
      select: { id: true, nome: true, email: true, papel: true, ativo: true, criadoEm: true },
    });

    if (data.ativo === false || data.senhaHash) {
      await prisma.sessao.deleteMany({ where: { usuarioId: alvo.id } });
    }

    return Response.json({ success: true, data: atualizado });
  } catch (error) {
    return jsonError(error);
  }
}
