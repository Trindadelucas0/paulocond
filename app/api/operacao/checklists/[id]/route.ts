export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { lerAdmin, lerSessao, responder } from "@/lib/operacao/guard";
import { ApiError } from "@/lib/tenant";
import { finalizarChecklist, iniciarChecklist, obterChecklist, questionarItem } from "@/lib/operacao/servico";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const sessao = await lerSessao(request);
    const { id } = await ctx.params;
    const data = await obterChecklist(sessao.condominio.id, id);
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
    if (!body) throw new ApiError(400, "VALIDACAO", "Envie a ação.");
    if (body.acao === "iniciar") {
      const data = await iniciarChecklist(sessao.condominio.id, id);
      return Response.json({ success: true, data });
    }
    if (body.acao === "finalizar") {
      const data = await finalizarChecklist(sessao.condominio.id, id, sessao.usuario.id);
      return Response.json({ success: true, data });
    }
    if (body.acao === "questionar") {
      const data = await questionarItem(sessao.condominio.id, sessao.usuario.id, String(body.itemId || ""), body.texto);
      return Response.json({ success: true, data });
    }
    throw new ApiError(400, "VALIDACAO", "Ação desconhecida.");
  } catch (error) {
    return responder(error);
  }
}
