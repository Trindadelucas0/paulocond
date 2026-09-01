"use client";

import { useRef } from "react";
import { formatBRL, mesLabel } from "@/lib/format";
import { gsap, registerMotion, useGSAP } from "@/lib/motion";

type Ponto = {
  competencia: string;
  receitaCents: number;
  despesaCents: number;
  qualidade: string;
};

export function BarrasMensais({
  serie,
  foco,
  onFoco,
}: {
  serie: Ponto[];
  foco: string | null;
  onFoco: (competencia: string) => void;
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
    { scope: root, dependencies: [serie, foco] },
  );

  const max = serie.length === 0 ? 1 : Math.max(...serie.flatMap((s) => [s.receitaCents, s.despesaCents]), 1);

  return (
    <div ref={root} className="chart-scroll">
      {serie.length === 0 ? (
        <p className="text-sm text-muted">Sem série mensal.</p>
      ) : (
      <div className="chart-track">
        {serie.map((m) => {
          const ativo = m.competencia === foco;
          const hRec = Math.max((m.receitaCents / max) * 132, 4);
          const hDes = Math.max((m.despesaCents / max) * 132, 4);
          return (
            <button
              key={m.competencia}
              type="button"
              onClick={() => onFoco(m.competencia)}
              className="js-month flex min-w-8 flex-1 flex-col items-center gap-1.5 sm:min-w-10"
              aria-pressed={ativo}
            >
              <div className="flex h-32 w-full items-end justify-center gap-0.5 sm:h-40 sm:gap-1">
                <span
                  className={`js-bar bar-fill w-2.5 rounded-t-lg sm:w-3.5 ${ativo ? "bg-forest" : "hatch"}`}
                  style={{ height: hRec }}
                  title={`Receita ${formatBRL(m.receitaCents)}`}
                />
                <span
                  className={`js-bar bar-fill w-2.5 rounded-t-lg sm:w-3.5 ${ativo ? "bg-forest-dark" : "bg-forest-soft"}`}
                  style={{ height: hDes }}
                  title={`Despesa registrada ${formatBRL(m.despesaCents)}`}
                />
              </div>
              <span className={`text-[11px] font-semibold ${ativo ? "text-forest" : "text-muted"}`}>
                {mesLabel(m.competencia)}
                {m.qualidade === "PARCIAL" ? "*" : m.qualidade === "RESIDUAL_MES_AUSENTE" ? "†" : ""}
              </span>
            </button>
          );
        })}
      </div>
      )}
      {serie.length > 0 ? (
      <p className="mt-3 text-[11px] text-muted">* mês parcial · † reconstruído (coluna mensal ausente na planilha)</p>
      ) : null}
    </div>
  );
}
