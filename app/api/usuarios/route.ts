export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { z } from "zod";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, jsonError } from "@/lib/tenant";
import { origemPermitida } from "@/lib/auth/origem";
import { hashSenha, SENHA_MINIMA } from "@/lib/auth/senha";
import { requireAdmin } from "@/lib/auth/sessao";

const criarSchema = z.object({
  nome: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  senha: z.string().min(SENHA_MINIMA),
  papel: z.enum(["ADMIN", "LEITURA"]),
});

export async function GET(request: NextRequest) {
  try {
    const sessao = await requireAdmin(request);
    const usuarios = await prisma.usuario.findMany({
      where: { condominioId: sessao.condominio.id },
      orderBy: [{ papel: "asc" }, { nome: "asc" }],
      select: {
        id: true,
        nome: true,
        email: true,
        papel: true,
        ativo: true,
        criadoEm: true,
      },
    });
    return Response.json({ success: true, data: usuarios });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!origemPermitida(request)) {
      throw new ApiError(403, "ORIGEM_INVALIDA", "Origem da requisição não permitida.");
    }
    const sessao = await requireAdmin(request);
    const body = criarSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      throw new ApiError(
        400,
        "VALIDACAO",
        `Preencha nome, e-mail, senha (mínimo ${SENHA_MINIMA} caracteres) e papel.`,
      );
    }
    const email = body.data.email.toLowerCase();
    const duplicado = await prisma.usuario.findFirst({
      where: { condominioId: sessao.condominio.id, email },
    });
    if (duplicado) {
      throw new ApiError(409, "EMAIL_DUPLICADO", "Já existe um usuário com este e-mail.");
    }
    const criado = await prisma.usuario.create({
      data: {
        condominioId: sessao.condominio.id,
        nome: body.data.nome,
        email,
        senhaHash: await hashSenha(body.data.senha),
        papel: body.data.papel,
        ativo: true,
      },
      select: { id: true, nome: true, email: true, papel: true, ativo: true, criadoEm: true },
    });
    return Response.json({ success: true, data: criado }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
