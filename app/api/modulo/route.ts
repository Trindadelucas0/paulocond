export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { carregarDadosCondominio } from "@/lib/dados";
import { isModuloId, isOrdemId, isRecorteId, type ModuloId, type OrdemId, type RecorteId } from "@/lib/format";
import { montarModulo } from "@/lib/modulos";
import { jsonError, ApiError } from "@/lib/tenant";
import { requireAuth } from "@/lib/auth/sessao";
import { podeVerConfig } from "@/lib/auth/papeis";

export async function GET(request: NextRequest) {
  try {
    const moduloParam = request.nextUrl.searchParams.get("modulo") ?? "";
    const recorteParam = request.nextUrl.searchParams.get("recorte") ?? "oficial-2026";
    const ordemParam = request.nextUrl.searchParams.get("ordem") ?? "valor";

    if (!isModuloId(moduloParam)) {
      return Response.json(
        {
          success: false,
          error: {
            code: "MODULO_INVALIDO",
            message: "Módulo inválido.",
          },
        },
        { status: 400 },
      );
    }
    if (!isRecorteId(recorteParam)) {
      return Response.json(
        {
          success: false,
          error: { code: "RECORTE_INVALIDO", message: "Recorte inválido." },
        },
        { status: 400 },
      );
    }
    if (!isOrdemId(ordemParam)) {
      return Response.json(
        {
          success: false,
          error: { code: "ORDEM_INVALIDA", message: "Ordem inválida. Use valor ou nome." },
        },
        { status: 400 },
      );
    }

    const modulo: ModuloId = moduloParam;
    const recorte: RecorteId = recorteParam;
    const ordem: OrdemId = ordemParam;
    const sessao = await requireAuth(request);
    if (modulo === "configuracoes" && !podeVerConfig(sessao.usuario.papel)) {
      throw new ApiError(403, "SEM_PERMISSAO", "Apenas administradores veem as configurações.");
    }
    const { condominio, totais, periodos, lancamentos } = await carregarDadosCondominio(sessao);

    const payload = montarModulo({
      modulo,
      recorte,
      ordem,
      condominio: { nome: condominio.nome, codigo: condominio.codigo },
      totais,
      periodos,
      lancamentos,
    });

    return Response.json({ success: true, data: payload });
  } catch (error) {
    return jsonError(error);
  }
}
