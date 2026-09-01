import { prisma } from "@/lib/prisma";
import { ApiError, condominioAtivo } from "@/lib/tenant";
import type { LancamentoComRel } from "@/lib/kpis";

export async function carregarDadosCondominio() {
  const condominio = await condominioAtivo();
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
    throw new ApiError(404, "SEM_DADOS", "Nenhum demonstrativo importado. Rode npm run importar.");
  }

  return {
    condominio,
    totais,
    periodos,
    lancamentos: lancamentos as LancamentoComRel[],
  };
}
