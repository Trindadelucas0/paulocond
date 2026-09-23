export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { gravarEvidencia } from "@/lib/operacao/arquivos";
import { lerAdmin, responder } from "@/lib/operacao/guard";
import { ApiError } from "@/lib/tenant";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const sessao = await lerAdmin(request);
    const { id } = await ctx.params;
    const form = await request.formData();
    const arquivo = form.get("foto");
    if (!(arquivo instanceof File)) throw new ApiError(400, "VALIDACAO", "Envie a foto.");
    const itemId = form.get("itemId");
    const data = await gravarEvidencia({
      condominioId: sessao.condominio.id,
      checklistId: id,
      itemId: typeof itemId === "string" && itemId ? itemId : null,
      usuarioId: sessao.usuario.id,
      arquivo,
    });
    return Response.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return responder(error);
  }
}
