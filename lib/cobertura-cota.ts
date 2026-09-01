import { somaNome } from "@/lib/dataset";
import type { LancamentoComRel } from "@/lib/kpis";
import { SALDO_INICIAL_CENTS } from "@/lib/money";

export type CoberturaCotaPayload = {
  cotasCents: number;
  saldoEntradaCents: number;
  disponivelCents: number;
  despesaCents: number;
  sobrouCents: number;
  cobriu: boolean;
  coberturaPct: number | null;
  outrasReceitasCents: number;
  receitaTotalCents: number;
  resultadoGeralCents: number;
};

export function montarCoberturaCota(params: {
  lancamentos: LancamentoComRel[];
  receitaCents: number;
  despesaCents: number;
}): CoberturaCotaPayload {
  const { lancamentos, receitaCents, despesaCents } = params;
  const cotasCents = somaNome(lancamentos, "Cotas de Condomínio", "RECEITA");
  const saldoEntradaCents = SALDO_INICIAL_CENTS;
  const disponivelCents = cotasCents + saldoEntradaCents;
  const sobrouCents = disponivelCents - despesaCents;
  const outrasReceitasCents = receitaCents - cotasCents;
  const coberturaPct = despesaCents === 0 ? null : disponivelCents / despesaCents;

  return {
    cotasCents,
    saldoEntradaCents,
    disponivelCents,
    despesaCents,
    sobrouCents,
    cobriu: sobrouCents >= 0,
    coberturaPct,
    outrasReceitasCents,
    receitaTotalCents: receitaCents,
    resultadoGeralCents: receitaCents - despesaCents,
  };
}
