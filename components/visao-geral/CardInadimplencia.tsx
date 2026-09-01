"use client";

import { formatBRL, formatPercentualBp } from "@/lib/format";
import type { InadimplenciaPayload } from "@/lib/inadimplencia";

export function CardInadimplencia({ dados }: { dados: InadimplenciaPayload }) {
  const maxBp = Math.max(...dados.meses.map((m) => m.percentualBp), 1);

  return (
    <article
      className="js-block min-w-0 rounded-3xl border border-card-line bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5"
      aria-labelledby="inadimplencia-titulo"
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="inadimplencia-titulo" className="text-lg font-bold">
            Inadimplência
          </h2>
          <p className="mt-1 text-sm text-muted">
            Saldo em atraso no fim de cada mês · {dados.rotuloPeriodo}.
          </p>
        </div>
        <span className="inline-flex shrink-0 self-start rounded-full bg-forest-soft px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-forest">
          Média 12 meses {formatPercentualBp(dados.mediaPercentualBp)}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
        <div className="rounded-2xl bg-page px-4 py-3">
          <p className="text-sm text-muted">Último mês ({dados.ultimo.rotulo})</p>
          <p className="kpi-valor">{formatBRL(dados.ultimo.valorCents)}</p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-forest">
            {formatPercentualBp(dados.ultimo.percentualBp)}
          </p>
        </div>
        <div className="rounded-2xl bg-page px-4 py-3">
          <p className="text-sm text-muted">Maior saldo ({dados.pico.rotulo})</p>
          <p className="kpi-valor">{formatBRL(dados.pico.valorCents)}</p>
          <p className="mt-1 text-sm font-semibold tabular-nums">
            {formatPercentualBp(dados.pico.percentualBp)}
          </p>
        </div>
      </div>

      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[18rem] border-collapse text-sm">
          <caption className="sr-only">
            Inadimplência mensal de {dados.rotuloPeriodo}: valor em reais e percentual. Total acumulado é a média dos
            percentuais, sem soma dos valores.
          </caption>
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th scope="col" className="py-2 pr-2 font-semibold">
                Mês
              </th>
              <th scope="col" className="py-2 pr-2 text-right font-semibold">
                Valor
              </th>
              <th scope="col" className="py-2 pl-2 text-right font-semibold">
                Percentual
              </th>
            </tr>
          </thead>
          <tbody>
            {dados.meses.map((mes) => {
              const atual = mes.competencia === dados.ultimo.competencia;
              const pico = mes.competencia === dados.pico.competencia;
              const anoCorrente = mes.competencia.startsWith("2026-");
              const barra = Math.max(6, (mes.percentualBp / maxBp) * 100);
              return (
                <tr
                  key={mes.competencia}
                  className={`border-b border-line/80 ${pico ? "bg-warning-soft/60" : ""}`}
                >
                  <th scope="row" className={`py-2 pr-2 font-medium ${anoCorrente ? "font-semibold" : "font-medium"}`}>
                    {mes.rotulo}
                    {atual ? <span className="sr-only"> (último mês)</span> : null}
                    {pico ? <span className="sr-only"> (maior saldo)</span> : null}
                  </th>
                  <td className={`py-2 pr-2 text-right tabular-nums ${anoCorrente ? "font-semibold" : ""}`}>
                    {formatBRL(mes.valorCents)}
                  </td>
                  <td className="py-2 pl-2">
                    <div className="flex flex-col items-end gap-1">
                      <span className="tabular-nums font-semibold">{formatPercentualBp(mes.percentualBp)}</span>
                      <span className="h-1 w-16 overflow-hidden rounded-full bg-page" role="presentation">
                        <span
                          className={`block h-full rounded-full ${atual ? "bg-forest" : "bg-forest-mid"}`}
                          style={{ width: `${barra}%` }}
                        />
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-page">
              <th scope="row" colSpan={2} className="py-2.5 pr-2 text-left font-bold">
                Total acumulado
              </th>
              <td className="py-2.5 pl-2 text-right font-bold tabular-nums">
                {formatPercentualBp(dados.mediaPercentualBp)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-4 text-xs text-muted">{dados.nota}</p>
    </article>
  );
}
