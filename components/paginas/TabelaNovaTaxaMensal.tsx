"use client";

import { formatNumero, mesLabel } from "@/lib/format";
import type { NovaTaxaMensalCelula, NovaTaxaMensalPayload } from "@/lib/nova-taxa-ideal";

function Celula({
  valor,
  bold,
  ocultar,
  className = "",
}: {
  valor: NovaTaxaMensalCelula | number | null;
  bold?: boolean;
  ocultar?: boolean;
  className?: string;
}) {
  const cents = typeof valor === "number" || valor === null ? valor : valor.valorCents;
  const residual = typeof valor === "object" && valor !== null ? valor.residual : false;
  return (
    <td
      className={`whitespace-nowrap px-2 py-2.5 text-right tabular-nums ${bold ? "font-bold" : "font-medium"} ${className}`}
    >
      {ocultar || cents === null ? (
        <span className="text-muted">—</span>
      ) : (
        <>
          {formatNumero(cents)}
          {residual ? " †" : ""}
        </>
      )}
    </td>
  );
}

export function TabelaNovaTaxaMensal({ dados }: { dados: NovaTaxaMensalPayload }) {
  if (dados.competencias.length === 0) {
    return <p className="mt-4 text-sm text-muted">Sem competências neste recorte.</p>;
  }

  return (
    <div className="mt-6 overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <caption className="sr-only">Nova taxa prevista por competência</caption>
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <th className="sticky left-0 z-20 min-w-[10rem] bg-surface py-2 pr-3 font-semibold sm:min-w-[12rem]">
              Composição
            </th>
            {dados.competencias.map((c) => (
              <th key={c} className="whitespace-nowrap px-2 py-2 text-right font-semibold">
                {mesLabel(c)}
              </th>
            ))}
            <th className="sticky right-[6.5rem] z-20 min-w-[6.5rem] bg-surface py-2 pl-3 text-right font-semibold">
              Média
            </th>
            <th className="sticky right-0 z-20 min-w-[6.5rem] bg-surface py-2 pl-3 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {dados.linhas.map((linha) => {
            const destaque = linha.papel !== "custo";
            const bg = destaque ? "bg-page/95" : "bg-surface";
            return (
              <tr key={linha.id} className="border-b border-line">
                <th
                  scope="row"
                  className={`sticky left-0 z-10 min-w-[10rem] py-2.5 pr-3 sm:min-w-[12rem] ${bg} ${destaque ? "font-bold" : "font-medium"}`}
                >
                  {linha.rotulo}
                </th>
                {linha.porCompetencia.map((cel) => (
                  <Celula key={cel.competencia} valor={cel} bold={destaque} />
                ))}
                <Celula
                  valor={linha.mediaCents}
                  bold={destaque}
                  className={`sticky right-[6.5rem] z-10 min-w-[6.5rem] ${bg}`}
                />
                <Celula
                  valor={linha.totalCents}
                  bold={destaque}
                  ocultar={linha.papel === "media"}
                  className={`sticky right-0 z-10 min-w-[6.5rem] ${bg}`}
                />
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-[11px] text-muted">
        Média = meses com valor (Set/2026 fora). Total da média por unidade não se soma. † = residual. Impostos não
        entram neste total.
      </p>
    </div>
  );
}
