"use client";

import { formatBRL, formatPct } from "@/lib/format";
import type { RankingItem } from "@/lib/modulos";

export function RankingLista({ itens, rotulo }: { itens: RankingItem[]; rotulo: string }) {
  if (itens.length === 0) {
    return (
      <article className="js-block rounded-3xl border border-card-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
        <h2 className="text-lg font-bold">{rotulo}</h2>
        <p className="mt-3 text-sm text-muted">Sem itens neste recorte.</p>
      </article>
    );
  }
  const max = Math.max(...itens.map((i) => Math.abs(i.valorCents)), 1);
  return (
    <article className="js-block rounded-3xl border border-card-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
      <h2 className="text-lg font-bold">{rotulo}</h2>
      <ul className="mt-4 space-y-3">
        {itens.map((item) => (
          <li key={`${item.grupo}-${item.nome}`}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className={item.destaque ? "font-bold text-forest" : "font-medium"}>
                {item.nome}
                {item.destaque ? (
                  <span className="ml-2 rounded-full bg-forest-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-forest">
                    Destaque
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 font-semibold">
                {formatBRL(item.valorCents)}{" "}
                <span className="text-xs font-medium text-muted">{formatPct(item.participacao).replace("+", "")}</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-page">
              <span
                className={`js-bar bar-fill block h-full rounded-full ${item.destaque ? "bg-forest" : "hatch"}`}
                style={{ width: `${Math.max((Math.abs(item.valorCents) / max) * 100, 2)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}
