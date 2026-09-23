export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { lerAdmin, lerSessao, responder } from "@/lib/operacao/guard";
import { ApiError } from "@/lib/tenant";
import {
  editarManutencao,
  excluirManutencao,
  mudarStatusManutencao,
  obterManutencao,
} from "@/lib/operacao/servico";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const sessao = await lerSessao(request);
    const { id } = await ctx.params;
    const data = await obterManutencao(sessao.condominio.id, id);
    return Response.json({ success: true, data });
  } catch (error) {
    return responder(error);
  }
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const sessao = await lerAdmin(request);
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new ApiError(400, "VALIDACAO", "Envie os dados da manutenção.");
    const acao = String(body.acao || "editar");
    if (acao === "iniciar") {
      const data = await mudarStatusManutencao(sessao.condominio.id, id, sessao.usuario.id, "em_andamento");
      return Response.json({ success: true, data });
    }
    if (acao === "dar_baixa") {
      const data = await mudarStatusManutencao(
        sessao.condominio.id,
        id,
        sessao.usuario.id,
        "concluida",
        body.notas ? String(body.notas) : "",
      );
      return Response.json({ success: true, data });
    }
    if (acao === "cancelar") {
      const data = await mudarStatusManutencao(sessao.condominio.id, id, sessao.usuario.id, "cancelada");
      return Response.json({ success: true, data });
    }
    const data = await editarManutencao(sessao.condominio.id, id, body);
    return Response.json({ success: true, data });
  } catch (error) {
    return responder(error);
  }
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  try {
    const sessao = await lerAdmin(request);
    const { id } = await ctx.params;
    await excluirManutencao(sessao.condominio.id, id);
    return Response.json({ success: true });
  } catch (error) {
    return responder(error);
  }
}
