export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { condominioAtivo, jsonError } from "@/lib/tenant";
import { SALDO_INICIAL_CENTS } from "@/lib/money";
import {
  COMPETENCIAS_JAN_JUL_2026,
  isKpiId,
  isRecorteId,
  type RecorteId,
  type KpiId,
} from "@/lib/format";

export async function GET(request: NextRequest) {
  try {
    const kpiParam = request.nextUrl.searchParams.get("kpi") ?? "";
    const recorteParam = request.nextUrl.searchParams.get("recorte") ?? "oficial-2026";
    if (!isKpiId(kpiParam)) {
      return Response.json(
        {
          success: false,
          error: { code: "KPI_INVALIDO", message: "Informe kpi=saldo|receitas|despesas|resultado." },
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
    const kpi: KpiId = kpiParam;
    const recorte: RecorteId = recorteParam;
    const condominio = await condominioAtivo();

    const origem = recorte === "oficial-2025" ? "PLANILHA_2025" : "PLANILHA_2026";
    const janJul = new Set<string>(COMPETENCIAS_JAN_JUL_2026);

    const totais = await prisma.totalOficial.findMany({
      where: { condominioId: condominio.id },
    });
    const oficial = totais.find((t) => t.origem === origem);
    if (!oficial) {
      return Response.json(
        { success: false, error: { code: "SEM_DADOS", message: "Totais oficiais ausentes." } },
        { status: 404 },
      );
    }

    const lancamentos = await prisma.lancamento.findMany({
      where: {
        condominioId: condominio.id,
        origem,
        ...(kpi === "receitas" ? { tipo: "RECEITA" } : {}),
        ...(kpi === "despesas" ? { tipo: "DESPESA" } : {}),
      },
      include: { categoria: true, periodo: true },
      orderBy: { linhaPlanilha: "asc" },
    });

    const filtrados =
      recorte === "equivalente-jan-jul"
        ? lancamentos.filter((l) => janJul.has(l.periodo.competencia))
        : lancamentos;

    const porCategoria = new Map<
      string,
      { nome: string; grupo: string; valorCents: number; meses: { competencia: string; valorCents: number; origemValor: string }[] }
    >();
    for (const l of filtrados) {
      if (kpi === "saldo" || kpi === "resultado") {
        /* aggregated below */
      }
      const key = l.categoriaId;
      const cur = porCategoria.get(key) ?? {
        nome: l.categoria.nome,
        grupo: l.categoria.grupo,
        valorCents: 0,
        meses: [],
      };
      cur.valorCents += l.valorCents;
      cur.meses.push({
        competencia: l.periodo.competencia,
        valorCents: l.valorCents,
        origemValor: l.origemValor,
      });
      porCategoria.set(key, cur);
    }

    const categorias = [...porCategoria.values()]
      .filter((c) => kpi === "saldo" || kpi === "resultado" || c.valorCents !== 0)
      .sort((a, b) => Math.abs(b.valorCents) - Math.abs(a.valorCents));

    const valorOficial =
      kpi === "saldo"
        ? recorte === "equivalente-jan-jul"
          ? null
          : oficial.saldoFinalCents
        : kpi === "receitas"
          ? recorte === "equivalente-jan-jul"
            ? categorias.reduce((a, c) => a + c.valorCents, 0)
            : oficial.receitaCents
          : kpi === "despesas"
            ? recorte === "equivalente-jan-jul"
              ? categorias.reduce((a, c) => a + c.valorCents, 0)
              : oficial.despesaCents
            : recorte === "equivalente-jan-jul"
              ? null
              : oficial.resultadoCents;

    return Response.json({
      success: true,
      data: {
        kpi,
        recorte,
        condominioId: condominio.id,
        arquivo: oficial.arquivo,
        origem,
        valorCents: valorOficial,
        criterio: recorte === "equivalente-jan-jul" ? "SOMA_MESES_EQUIVALENTES" : "COLUNA_B",
        statusDespesa: "Despesa registrada",
        categorias: kpi === "saldo" ? [] : categorias,
        metadadoPeriodo:
          kpi === "saldo"
            ? {
                saldoInicialCents: SALDO_INICIAL_CENTS,
                saldoFinalCents: oficial.saldoFinalCents,
                rotulo: "Saldo gerencial do demonstrativo",
              }
            : undefined,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
