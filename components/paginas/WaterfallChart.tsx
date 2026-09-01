"use client";

import { formatBRL } from "@/lib/format";
import type { WaterfallStep } from "@/lib/modulos";

export function WaterfallChart({ passos }: { passos: WaterfallStep[] }) {
  if (passos.length === 0) return null;
  const max = Math.max(...passos.map((p) => Math.abs(p.valorCents)), 1);
  return (
    <article className="js-block rounded-3xl border border-card-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
      <h2 className="text-lg font-bold">Composição do saldo gerencial</h2>
      <p className="mb-4 text-sm text-muted">Saldo inicial + receitas − despesas registradas = saldo final</p>
      <ul className="space-y-4">
        {passos.map((passo) => {
          const largura = Math.max((Math.abs(passo.valorCents) / max) * 100, 4);
          const tom =
            passo.tipo === "negativo"
              ? "bg-danger"
              : passo.tipo === "total"
                ? "bg-forest"
                : passo.tipo === "positivo"
                  ? "bg-forest-mid"
                  : "hatch";
          return (
            <li key={passo.rotulo}>
              <div className="mb-1 flex justify-between gap-3 text-sm">
                <span className="font-medium">{passo.rotulo}</span>
                <span className="font-bold">
                  {passo.tipo === "negativo" ? "− " : passo.tipo === "positivo" ? "+ " : ""}
                  {formatBRL(passo.valorCents)}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-page">
                <span className={`js-bar bar-fill block h-full rounded-full ${tom}`} style={{ width: `${largura}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
