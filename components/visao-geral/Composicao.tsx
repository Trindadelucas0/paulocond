"use client";

import type { Fatia } from "@/lib/kpis";
import { formatBRL, formatPct } from "@/lib/format";

const CORES = ["#185a49", "#2f8a6a", "#7bb89a", "#b7d8c8", "#d9ebe3", "#9ca3af", "#6b7280", "#4b5563"];

export function Composicao({ fatias }: { fatias: Fatia[] }) {
  if (fatias.length === 0) {
    return <p className="text-sm text-muted">Sem composição neste recorte.</p>;
  }
  const visiveis = fatias.filter((f) => f.valorCents !== 0).slice(0, 8);
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-page" aria-hidden>
        {visiveis.map((f, i) => (
          <span
            key={f.grupo}
            className="js-bar h-full"
            style={{ width: `${Math.max(f.participacao * 100, 0)}%`, background: CORES[i % CORES.length] }}
          />
        ))}
      </div>
      <ul className="mt-4 space-y-2">
        {visiveis.map((f, i) => (
          <li key={f.grupo} className="flex items-start justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CORES[i % CORES.length] }} aria-hidden />
              <span className="min-w-0 break-words">{f.grupo}</span>
            </span>
            <span className="shrink-0 text-right font-semibold tabular-nums">
              {formatBRL(f.valorCents)}{" "}
              <span className="text-xs font-medium text-muted">{formatPct(f.participacao).replace("+", "")}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
