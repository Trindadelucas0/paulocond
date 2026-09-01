"use client";

import type { CoberturaCotaPayload } from "@/lib/cobertura-cota";
import { formatBRL } from "@/lib/format";

type Linha = { rotulo: string; valorCents: number; destaque?: boolean };

function LinhaValor({ rotulo, valorCents, destaque }: Linha) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="min-w-0 text-muted">{rotulo}</span>
      <span className={`shrink-0 font-semibold tabular-nums ${destaque ? "text-lg" : ""}`}>
        {formatBRL(valorCents)}
      </span>
    </div>
  );
}

export function CoberturaCota({ dados }: { dados: CoberturaCotaPayload }) {
  const barraPct =
    dados.coberturaPct === null ? 0 : Math.min(100, Math.max(0, dados.coberturaPct * 100));
  const restoPositivo = dados.sobrouCents >= 0;

  return (
    <article
      className="js-block min-w-0 rounded-3xl border border-card-line bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5"
      aria-labelledby="cobertura-cota-titulo"
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="cobertura-cota-titulo" className="text-lg font-bold">
            A cota cobriu as despesas?
          </h2>
          <p className="mt-1 text-sm text-muted">
            Conta simples: cota + saldo de entrada − despesas registradas do recorte.
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 self-start rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
            dados.cobriu ? "bg-forest-soft text-forest" : "bg-danger-soft text-danger"
          }`}
        >
          {dados.cobriu ? "Cobriu" : "Não cobriu"}
        </span>
      </div>

      <div className="space-y-3">
        <LinhaValor rotulo="Entrou de cota" valorCents={dados.cotasCents} />
        <LinhaValor rotulo="Saldo de entrada" valorCents={dados.saldoEntradaCents} />
        <LinhaValor rotulo="Disponível (cota + saldo)" valorCents={dados.disponivelCents} />
        <LinhaValor rotulo="Saiu (despesas registradas)" valorCents={dados.despesaCents} />
        <div className="border-t border-line pt-3">
          <LinhaValor
            rotulo={restoPositivo ? "Sobrou" : "Faltou"}
            valorCents={Math.abs(dados.sobrouCents)}
            destaque
          />
        </div>
      </div>

      {dados.despesaCents > 0 ? (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-muted">
            <span>Cobertura da cota sobre as despesas</span>
            <span className="font-semibold tabular-nums">{barraPct.toFixed(0)}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-page" role="presentation">
            <span
              className={`block h-full rounded-full ${dados.cobriu ? "bg-forest" : "bg-danger"}`}
              style={{ width: `${barraPct}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-4 space-y-2 rounded-2xl bg-page px-4 py-3 text-sm">
        <p className="text-muted">
          Saldo de entrada é <strong className="text-ink">R$ 0,00</strong> neste ciclo (não usa o Saldo anterior da
          planilha).
        </p>
        <p className="text-muted">
          Outras receitas do recorte: <strong className="text-ink">{formatBRL(dados.outrasReceitasCents)}</strong>{" "}
          (aluguéis, fundo, taxas extras, eventuais).
        </p>
        <p className="text-muted">
          Resultado geral (todas as receitas − despesas):{" "}
          <strong className={dados.resultadoGeralCents >= 0 ? "text-forest" : "text-danger"}>
            {formatBRL(dados.resultadoGeralCents)}
          </strong>
        </p>
      </div>
    </article>
  );
}
