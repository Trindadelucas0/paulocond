export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { lerAdmin, responder } from "@/lib/operacao/guard";
import { ApiError } from "@/lib/tenant";
import { alternarModelo, editarModelo } from "@/lib/operacao/servico";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const sessao = await lerAdmin(request);
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new ApiError(400, "VALIDACAO", "Envie os dados do modelo.");
    const data =
      body.acao === "alternar"
        ? await alternarModelo(sessao.condominio.id, id)
        : await editarModelo(sessao.condominio.id, id, body);
    return Response.json({ success: true, data });
  } catch (error) {
    return responder(error);
  }
}
