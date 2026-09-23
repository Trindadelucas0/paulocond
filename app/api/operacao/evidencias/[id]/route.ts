export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import fs from "fs";
import { NextRequest } from "next/server";
import { lerEvidencia } from "@/lib/operacao/arquivos";
import { lerSessao, responder } from "@/lib/operacao/guard";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const sessao = await lerSessao(request);
    const { id } = await ctx.params;
    const arquivo = await lerEvidencia(sessao.condominio.id, id);
    const stream = fs.readFileSync(arquivo.absoluto);
    return new Response(stream, {
      headers: {
        "Content-Type": arquivo.tipo,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return responder(error);
  }
}
