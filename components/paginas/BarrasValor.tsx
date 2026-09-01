"use client";

import { useRef } from "react";
import { formatBRL, mesLabel } from "@/lib/format";
import { gsap, registerMotion, useGSAP } from "@/lib/motion";

type Ponto = { competencia: string; valorCents: number; qualidade: string };

export function BarrasValor({
  serie,
  rotulo,
}: {
  serie: Ponto[];
  rotulo: string;
}) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    (_ctx, contextSafe) => {
      registerMotion();
      if (!root.current || !contextSafe) return;
      const bars = root.current.querySelectorAll<HTMLElement>(".js-month");
      const enter = contextSafe((ev: Event) => {
        gsap.to(ev.currentTarget as HTMLElement, { y: -4, duration: 0.2, overwrite: "auto" });
      });
      const leave = contextSafe((ev: Event) => {
        gsap.to(ev.currentTarget as HTMLElement, { y: 0, duration: 0.2, overwrite: "auto" });
      });
      bars.forEach((bar) => {
        bar.addEventListener("pointerenter", enter);
        bar.addEventListener("pointerleave", leave);
      });
      return () => {
        bars.forEach((bar) => {
          bar.removeEventListener("pointerenter", enter);
          bar.removeEventListener("pointerleave", leave);
        });
      };
    },
    { scope: root, dependencies: [serie] },
  );

  const max = serie.length === 0 ? 1 : Math.max(...serie.map((s) => Math.abs(s.valorCents)), 1);

  return (
    <div ref={root} className="overflow-x-auto">
      {serie.length === 0 ? (
        <p className="text-sm text-muted">Sem série mensal.</p>
      ) : (
        <div className="flex min-w-[640px] items-end gap-3 pt-2">
          {serie.map((m) => {
            const h = Math.max((Math.abs(m.valorCents) / max) * 160, 4);
            return (
              <div key={m.competencia} className="js-month flex flex-1 flex-col items-center gap-2">
                <div className="flex h-44 w-full items-end justify-center">
                  <span
                    className="js-bar bar-fill w-4 rounded-t-lg hatch sm:w-5"
                    style={{ height: h, transformOrigin: "bottom" }}
                    title={`${rotulo} ${formatBRL(m.valorCents)}`}
                  />
                </div>
                <span className="text-[11px] font-semibold text-muted">
                  {mesLabel(m.competencia)}
                  {m.qualidade === "PARCIAL" ? "*" : m.qualidade === "RESIDUAL_MES_AUSENTE" ? "†" : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
