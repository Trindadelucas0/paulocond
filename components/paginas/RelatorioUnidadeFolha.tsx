"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { formatBRL, UNIDADES_CONDOMINIO } from "@/lib/format";
import { gsap, registerMotion, useGSAP } from "@/lib/motion";

export function RelatorioUnidadeFolha({
  aberta,
  porUnidadeCents,
  unidades = UNIDADES_CONDOMINIO,
  onClose,
}: {
  aberta: boolean;
  porUnidadeCents: number;
  unidades?: number;
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
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(panel.current, { x: aberta ? 0 : 420, autoAlpha: aberta ? 1 : 0 });
      });
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to(panel.current, {
          x: aberta ? 0 : 420,
          autoAlpha: aberta ? 1 : 0,
          duration: 0.45,
          ease: "power2.out",
        });
      });
      return () => mm.revert();
    },
    { dependencies: [aberta] },
  );

  if (!aberta) return null;

  const lista = Array.from({ length: unidades }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
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

        <p className="mt-5 text-sm text-muted">
          Cada uma das {unidades} unidades ={" "}
          <strong className="text-ink tabular-nums">{formatBRL(porUnidadeCents)}</strong>
        </p>
        <p className="mt-2 text-xs text-muted">
          Rateio igualitário. Não há nomes de unidades neste sistema.
        </p>

        <div className="no-print mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            className="min-h-11 rounded-full bg-forest px-4 py-2 text-sm font-semibold text-white"
            onClick={() => window.print()}
          >
            Imprimir
          </button>
        </div>

        <ol className="print-only mt-6 list-none space-y-1 text-sm" aria-hidden="true">
          <li className="mb-3 font-bold">
            Relatório por unidade · {unidades} un. · {formatBRL(porUnidadeCents)} cada
          </li>
          {lista.map((n) => (
            <li key={n} className="flex justify-between border-b border-line py-1 tabular-nums">
              <span>Unidade {n}</span>
              <span>{formatBRL(porUnidadeCents)}</span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
