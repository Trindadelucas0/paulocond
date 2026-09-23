export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { lerAdmin, lerSessao, responder } from "@/lib/operacao/guard";
import { ApiError } from "@/lib/tenant";
import { criarModelo, listarModelos } from "@/lib/operacao/servico";

export async function GET(request: NextRequest) {
  try {
    const sessao = await lerSessao(request);
    const data = await listarModelos(sessao.condominio.id);
    return Response.json({ success: true, data });
  } catch (error) {
    return responder(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessao = await lerAdmin(request);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new ApiError(400, "VALIDACAO", "Envie os dados do modelo.");
    const data = await criarModelo(sessao.condominio.id, sessao.usuario.id, body);
    return Response.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return responder(error);
  }
}
