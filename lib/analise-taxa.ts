import { somaGrupo, somaNome } from "@/lib/dataset";
import type { LancamentoComRel } from "@/lib/kpis";

export const NOME_COTAS_CONDOMINIO = "Cotas de Condomínio";
export const NOME_COTAS_ACORDO = "Cotas de Acordo";
export const GRUPO_CONTRATOS_FIXOS = "Contratos fixos";
export const GRUPO_MANUTENCAO = "Manutenção";

export type AnaliseTaxaPapel = "entrada" | "saida" | "subtotal" | "resultado";

export type AnaliseTaxaLinha = {
  id: string;
  rotulo: string;
  valorCents: number;
  papel: AnaliseTaxaPapel;
};

export type AnaliseTaxaPayload = {
  taxaCents: number;
  contratosCents: number;
  resultado1Cents: number;
  manutencoesCents: number;
  resultado2Cents: number;
  cotasAcordoCents: number;
  resultado3Cents: number;
  linhas: AnaliseTaxaLinha[];
};

/**
 * Demonstrativo da taxa no recorte: cotas − contratos fixos (grupo inteiro)
 * − manutenção + cotas de acordo. Não é cobertura (cota vs todas as despesas).
 */
export function montarAnaliseTaxa(lancamentos: LancamentoComRel[]): AnaliseTaxaPayload {
  const taxaCents = somaNome(lancamentos, NOME_COTAS_CONDOMINIO, "RECEITA");
  const contratosCents = somaGrupo(lancamentos, GRUPO_CONTRATOS_FIXOS, "DESPESA");
  const resultado1Cents = taxaCents - contratosCents;
  const manutencoesCents = somaGrupo(lancamentos, GRUPO_MANUTENCAO, "DESPESA");
  const resultado2Cents = resultado1Cents - manutencoesCents;
  const cotasAcordoCents = somaNome(lancamentos, NOME_COTAS_ACORDO, "RECEITA");
  const resultado3Cents = resultado2Cents + cotasAcordoCents;

  return {
    taxaCents,
    contratosCents,
    resultado1Cents,
    manutencoesCents,
    resultado2Cents,
    cotasAcordoCents,
    resultado3Cents,
    linhas: [
      { id: "taxa", rotulo: "Valor da taxa condominial", valorCents: taxaCents, papel: "entrada" },
      { id: "contratos", rotulo: "(−) Contratos", valorCents: contratosCents, papel: "saida" },
      { id: "r1", rotulo: "Resultado 1", valorCents: resultado1Cents, papel: "subtotal" },
      { id: "manutencoes", rotulo: "(−) Manutenções", valorCents: manutencoesCents, papel: "saida" },
      { id: "r2", rotulo: "Resultado 2", valorCents: resultado2Cents, papel: "subtotal" },
      { id: "acordo", rotulo: "(+) Cotas de Acordo", valorCents: cotasAcordoCents, papel: "entrada" },
      { id: "r3", rotulo: "Resultado 3", valorCents: resultado3Cents, papel: "resultado" },
    ],
  };
}
