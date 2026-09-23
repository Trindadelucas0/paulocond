export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { lerAdmin, lerSessao, responder } from "@/lib/operacao/guard";
import { criarManutencao, listarManutencoes } from "@/lib/operacao/servico";

export async function GET(request: NextRequest) {
  try {
    const sessao = await lerSessao(request);
    const url = request.nextUrl;
    const data = await listarManutencoes(sessao.condominio.id, {
      tipo: url.searchParams.get("tipo") || undefined,
      status: url.searchParams.get("status") || undefined,
      busca: url.searchParams.get("busca") || undefined,
      responsavel: url.searchParams.get("responsavel") || undefined,
      pagina: Number(url.searchParams.get("pagina") || 1),
    });
    return Response.json({ success: true, data });
  } catch (error) {
    return responder(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessao = await lerAdmin(request);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new Error("corpo");
    const criada = await criarManutencao(sessao.condominio.id, sessao.usuario.id, body);
    return Response.json({ success: true, data: criada }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "corpo") {
      return Response.json(
        { success: false, error: { code: "VALIDACAO", message: "Envie os dados da manutenção." } },
        { status: 400 },
      );
    }
    return responder(error);
  }
}
