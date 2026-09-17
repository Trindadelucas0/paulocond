"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import type { LinhaRateioFracao } from "@/lib/fracao-ideal";
import { formatBRL } from "@/lib/format";
import { gsap, registerMotion, useGSAP } from "@/lib/motion";

export function RelatorioUnidadeFolha({
  aberta,
  linhas,
  totalCents,
  rotuloBase,
  onClose,
}: {
  aberta: boolean;
  linhas: LinhaRateioFracao[];
  totalCents: number;
  rotuloBase: string;
  onClose: () => void;
}) {
  const panel = useRef<HTMLElement>(null);
  const tituloId = useId();

  const fechar = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!aberta) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") fechar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberta, fechar]);

  useEffect(() => {
    if (!aberta) {
      document.body.classList.remove("print-folha-unidade");
      return;
    }
    document.body.classList.add("print-folha-unidade");
    return () => document.body.classList.remove("print-folha-unidade");
  }, [aberta]);

  useGSAP(
    () => {
      registerMotion();
      if (!panel.current) return;
      const mm = gsap.matchMedia();
      mm.add(
        {
          isPrint: "print",
          reduce: "(prefers-reduced-motion: reduce)",
          motion: "(prefers-reduced-motion: no-preference)",
        },
        (context) => {
          if (!panel.current) return;
          if (context.conditions?.isPrint) {
            gsap.set(panel.current, { x: 0, y: 0, autoAlpha: 1, clearProps: "transform" });
            panel.current.style.transform = "none";
            return;
          }
          if (context.conditions?.reduce) {
            gsap.set(panel.current, { x: aberta ? 0 : 420, autoAlpha: aberta ? 1 : 0 });
            return;
          }
          gsap.to(panel.current, {
            x: aberta ? 0 : 420,
            autoAlpha: aberta ? 1 : 0,
            duration: 0.45,
            ease: "power2.out",
          });
        },
      );
      return () => mm.revert();
    },
    { dependencies: [aberta] },
  );

  if (!aberta || typeof document === "undefined") return null;

  return createPortal(
    <div className="folha-unidade-overlay fixed inset-0 z-50 flex justify-end">
      <button type="button" className="no-print absolute inset-0 bg-ink/30" aria-label="Fechar relatório" onClick={fechar} />
      <aside
        ref={panel}
        className="folha-unidade-print relative h-full w-full max-w-full overflow-y-auto bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[var(--shadow-card)] sm:max-w-md sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
      >
        <div className="no-print flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-forest">Relatório</p>
            <h2 id={tituloId} className="text-xl font-extrabold">
              Por unidade
            </h2>
          </div>
          <button
            type="button"
            className="min-h-11 rounded-full border border-line px-3 py-1.5 text-sm"
            onClick={fechar}
          >
            Fechar
          </button>
        </div>

        <header className="folha-unidade-cabecalho mt-5">
          <h2 className="print-only text-xl font-extrabold">Relatório por unidade</h2>
          <p className="text-sm text-muted">
            Rateio por fração ideal · {linhas.length} unidades · {rotuloBase}. Total{" "}
            <strong className="text-ink tabular-nums">{formatBRL(totalCents)}</strong>.
          </p>
          <p className="mt-2 text-xs text-muted">Inclui 124 apartamentos e 12 vagas. Valores diferem pela fração.</p>
        </header>

        <div className="no-print mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            className="min-h-11 rounded-full bg-forest px-4 py-2 text-sm font-semibold text-white"
            onClick={() => window.print()}
          >
            Imprimir
          </button>
        </div>

        <table className="folha-unidade-tabela mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="py-2 pr-3 font-semibold">Unidade</th>
              <th className="py-2 text-right font-semibold">Valor</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.codigo} className="border-b border-line tabular-nums">
                <td className="py-1.5 pr-3">{l.codigo}</td>
                <td className="py-1.5 text-right">{formatBRL(l.valorCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </aside>
    </div>,
    document.body,
  );
}
