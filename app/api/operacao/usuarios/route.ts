export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { lerSessao, responder } from "@/lib/operacao/guard";
import { listarUsuarios } from "@/lib/operacao/servico";

export async function GET(request: NextRequest) {
  try {
    const sessao = await lerSessao(request);
    const data = await listarUsuarios(sessao.condominio.id);
    return Response.json({ success: true, data });
  } catch (error) {
    return responder(error);
  }
}
