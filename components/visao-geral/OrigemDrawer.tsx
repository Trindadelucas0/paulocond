"use client";

import { useRef } from "react";
import { formatBRL, mesLabel } from "@/lib/format";
import { gsap, registerMotion, useGSAP } from "@/lib/motion";

export type OrigemData = {
  kpi: string;
  recorte: string;
  arquivo: string;
  origem: string;
  valorCents: number | null;
  criterio: string;
  statusDespesa: string;
  categorias: {
    nome: string;
    grupo: string;
    valorCents: number;
    meses: { competencia: string; valorCents: number; origemValor: string }[];
  }[];
  metadadoPeriodo?: { saldoInicialCents: number; saldoFinalCents: number; rotulo: string };
};

export function OrigemDrawer({
  aberta,
  data,
  onClose,
}: {
  aberta: boolean;
  data: OrigemData | null;
  onClose: () => void;
}) {
  const panel = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      registerMotion();
      if (!panel.current) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(panel.current, { x: aberta ? 0 : 420, autoAlpha: aberta ? 1 : 0 });
      });
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to(panel.current, { x: aberta ? 0 : 420, autoAlpha: aberta ? 1 : 0, duration: 0.45, ease: "power2.out" });
      });
      return () => mm.revert();
    },
    { dependencies: [aberta, data] },
  );

  if (!aberta) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-ink/30" aria-label="Fechar origem" onClick={onClose} />
      <aside
        ref={panel}
        className="relative h-full w-full max-w-md overflow-y-auto bg-surface p-6 shadow-[var(--shadow-card)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="origem-titulo"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-forest">Ver origem</p>
            <h2 id="origem-titulo" className="text-xl font-extrabold capitalize">
              {data?.kpi ?? "Indicador"}
            </h2>
          </div>
          <button type="button" className="rounded-full border border-line px-3 py-1 text-sm" onClick={onClose}>
            Fechar
          </button>
        </div>
        {data ? (
          <div className="mt-4 space-y-4 text-sm">
            <p>
              <span className="text-muted">Arquivo:</span> {data.arquivo}
            </p>
            <p>
              <span className="text-muted">Critério:</span> {data.criterio === "COLUNA_B" ? "Total oficial da coluna B" : "Soma dos meses equivalentes"}
            </p>
            {data.valorCents !== null ? (
              <p className="text-2xl font-extrabold">{formatBRL(data.valorCents)}</p>
            ) : null}
            {data.metadadoPeriodo ? (
              <p className="rounded-2xl bg-page p-3 text-muted">{data.metadadoPeriodo.rotulo}</p>
            ) : null}
            <p className="text-muted">{data.statusDespesa}</p>
            <ul className="space-y-3">
              {data.categorias.slice(0, 20).map((cat) => (
                <li key={`${cat.grupo}-${cat.nome}`} className="rounded-2xl bg-page p-3">
                  <div className="flex justify-between gap-2 font-semibold">
                    <span>{cat.nome}</span>
                    <span>{formatBRL(cat.valorCents)}</span>
                  </div>
                  <p className="text-xs text-muted">{cat.grupo}</p>
                  <p className="mt-1 text-[11px] text-muted">
                    {cat.meses
                      .filter((m) => m.valorCents !== 0)
                      .slice(0, 6)
                      .map((m) => `${mesLabel(m.competencia)}${m.origemValor === "RESIDUAL_MES_AUSENTE" ? "†" : ""}`)
                      .join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
