export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { lerSessao, responder } from "@/lib/operacao/guard";
import { listarChecklists } from "@/lib/operacao/servico";

export async function GET(request: NextRequest) {
  try {
    const sessao = await lerSessao(request);
    const dataIso = request.nextUrl.searchParams.get("data") || new Date().toISOString().slice(0, 10);
    const departamento = request.nextUrl.searchParams.get("departamento") || undefined;
    const data = await listarChecklists(sessao.condominio.id, dataIso, departamento);
    return Response.json({ success: true, data });
  } catch (error) {
    return responder(error);
  }
}
