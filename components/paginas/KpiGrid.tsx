"use client";

import { formatBRL } from "@/lib/format";

export function KpiGrid({
  itens,
}: {
  itens: { id: string; rotulo: string; valorCents: number; extra?: string }[];
}) {
  if (itens.length === 0) return null;
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores">
      {itens.map((kpi) => (
        <article key={kpi.id} className="js-block rounded-3xl border border-card-line bg-surface p-5 shadow-[var(--shadow-card)]">
          <p className="text-sm text-muted">{kpi.rotulo}</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{formatBRL(kpi.valorCents)}</p>
          {kpi.extra ? <p className="mt-3 text-xs text-muted">{kpi.extra}</p> : null}
        </article>
      ))}
    </section>
  );
}
