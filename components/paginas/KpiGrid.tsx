"use client";

import { CardExportavel } from "@/components/paginas/CardExportavel";
import { formatBRL } from "@/lib/format";

export function KpiGrid({
  itens,
}: {
  itens: { id: string; rotulo: string; valorCents: number; extra?: string }[];
}) {
  if (itens.length === 0) return null;
  return (
    <section className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores">
      {itens.map((kpi) => (
        <CardExportavel key={kpi.id} as="article" className="js-block" titulo={kpi.rotulo}>
          <p className="text-sm text-muted">{kpi.rotulo}</p>
          <p className="kpi-valor">{formatBRL(kpi.valorCents)}</p>
          {kpi.extra ? <p className="mt-3 text-xs text-muted">{kpi.extra}</p> : null}
        </CardExportavel>
      ))}
    </section>
  );
}
