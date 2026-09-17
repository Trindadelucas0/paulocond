export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { condominioAtivo, jsonError } from "@/lib/tenant";
import { requireAuth } from "@/lib/auth/sessao";
import { isRecorteId, type RecorteId } from "@/lib/format";
import { montarVisaoGeral, type LancamentoComRel } from "@/lib/kpis";
import { montarAlertas } from "@/lib/alertas";

export async function GET(request: NextRequest) {
  try {
    const recorteParam = request.nextUrl.searchParams.get("recorte") ?? "oficial-2026";
    if (!isRecorteId(recorteParam)) {
      return Response.json(
        {
          success: false,
          error: {
            code: "RECORTE_INVALIDO",
            message: "Recorte inválido. Use oficial-2026, oficial-2025 ou equivalente-jan-jul.",
          },
        },
        { status: 400 },
      );
    }
    const recorte: RecorteId = recorteParam;
    const sessao = await requireAuth(request);
    const condominio = await condominioAtivo(sessao.condominio.id);

    const [totais, periodos, lancamentos] = await Promise.all([
      prisma.totalOficial.findMany({ where: { condominioId: condominio.id } }),
      prisma.periodo.findMany({
        where: { condominioId: condominio.id },
        orderBy: { competencia: "asc" },
      }),
      prisma.lancamento.findMany({
        where: { condominioId: condominio.id },
        include: { categoria: true, periodo: true },
      }),
    ]);

    if (totais.length === 0) {
      return Response.json(
        {
          success: false,
          error: { code: "SEM_DADOS", message: "Nenhum demonstrativo importado. Rode npm run importar." },
        },
        { status: 404 },
      );
    }

    const lancamentosTipados = lancamentos as LancamentoComRel[];
    const alertas = montarAlertas(lancamentosTipados);
    const payload = montarVisaoGeral({
      condominio: { nome: condominio.nome, codigo: condominio.codigo },
      recorte,
      totais,
      periodos,
      lancamentos: lancamentosTipados,
      alertas,
    });

    return Response.json({ success: true, data: payload });
  } catch (error) {
    return jsonError(error);
  }
}
