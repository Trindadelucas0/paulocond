export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { lerAdmin, responder } from "@/lib/operacao/guard";
import { ApiError } from "@/lib/tenant";
import { atualizarItemChecklist } from "@/lib/operacao/servico";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const sessao = await lerAdmin(request);
    const { id, itemId } = await ctx.params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new ApiError(400, "VALIDACAO", "Envie o item.");
    const data = await atualizarItemChecklist(sessao.condominio.id, id, itemId, body);
    return Response.json({ success: true, data });
  } catch (error) {
    return responder(error);
  }
}
