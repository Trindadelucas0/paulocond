export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { lerSessao, responder } from "@/lib/operacao/guard";
import { listarManutencoesExportacao } from "@/lib/operacao/servico";
import { linhaExportacao, pdfManutencoes, planilhaManutencoes } from "@/lib/operacao/exportar";
import { ApiError } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const sessao = await lerSessao(request);
    const url = request.nextUrl;
    const formato = url.searchParams.get("formato");
    if (formato !== "xlsx" && formato !== "pdf") {
      throw new ApiError(400, "VALIDACAO", "Formato inválido. Use Excel ou PDF.");
    }
    const filtros = {
      tipo: url.searchParams.get("tipo") || undefined,
      status: url.searchParams.get("status") || undefined,
      busca: url.searchParams.get("busca") || undefined,
      responsavel: url.searchParams.get("responsavel") || undefined,
    };
    const itens = await listarManutencoesExportacao(sessao.condominio.id, filtros);
    const linhas = itens.map(linhaExportacao);
    const dia = new Date().toISOString().slice(0, 10);
    const titulo = `Manutenções — ${sessao.condominio.nome}`;
    if (formato === "pdf") {
      const pdf = pdfManutencoes(linhas, titulo);
      return new Response(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="manutencoes-${dia}.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    }
    const xlsx = await planilhaManutencoes(linhas, titulo);
    return new Response(new Uint8Array(xlsx), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="manutencoes-${dia}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return responder(error);
  }
}
