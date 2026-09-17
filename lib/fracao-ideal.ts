import { z } from "zod";
import dados from "@/dados/fracoes-ideais.json";

export type UnidadeFracao = {
  codigo: string;
  fracao: number;
};

export type LinhaRateioFracao = {
  codigo: string;
  fracao: number;
  valorCents: number;
};

const arquivoSchema = z.object({
  unidades: z
    .array(
      z.object({
        codigo: z.string().min(1).max(16),
        fracao: z.number().gt(0).lt(1),
      }),
    )
    .min(1),
});

const arquivo = arquivoSchema.parse(dados);

export const UNIDADES_FRACAO: readonly UnidadeFracao[] = arquivo.unidades;

export function somaFracao(unidades: readonly UnidadeFracao[] = UNIDADES_FRACAO): number {
  return unidades.reduce((acc, u) => acc + u.fracao, 0);
}

export function filtrarUnidades<T extends { codigo: string }>(linhas: readonly T[], busca: string): T[] {
  const q = busca.trim().toLowerCase();
  if (!q) return [...linhas];
  const qNum = q.replace(/^v/, "");
  return linhas.filter((l) => {
    const c = l.codigo.toLowerCase();
    const cNum = c.replace(/^v/, "");
    return c === q || c.startsWith(q) || cNum === qNum;
  });
}

/**
 * Rateio do total pela fração. A última linha absorve o residual de arredondamento
 * para a soma das linhas igualar o total.
 */
export function ratearPorFracao(
  totalCents: number,
  unidades: readonly UnidadeFracao[] = UNIDADES_FRACAO,
): LinhaRateioFracao[] {
  if (unidades.length === 0) return [];
  const linhas: LinhaRateioFracao[] = unidades.map((u) => ({
    codigo: u.codigo,
    fracao: u.fracao,
    valorCents: Math.round(totalCents * u.fracao),
  }));
  const soma = linhas.reduce((acc, l) => acc + l.valorCents, 0);
  const ultimo = linhas[linhas.length - 1];
  if (ultimo) {
    ultimo.valorCents += totalCents - soma;
  }
  return linhas;
}
