import { ApiError, condominioAtivo } from "@/lib/tenant";
import type { SessaoAutenticada } from "@/lib/auth/sessao";
import { prisma } from "@/lib/prisma";
import type { LancamentoComRel } from "@/lib/kpis";

export async function carregarDadosCondominio(sessao: SessaoAutenticada) {
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
    throw new ApiError(404, "SEM_DADOS", "Nenhum demonstrativo importado. Rode npm run importar.");
  }

  return {
    condominio,
    totais,
    periodos,
    lancamentos: lancamentos as LancamentoComRel[],
  };
}
