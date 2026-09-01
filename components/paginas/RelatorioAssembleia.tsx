"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap, registerMotion, useGSAP } from "@/lib/motion";
import type { Slide } from "@/lib/modulos";

export function RelatorioAssembleia({
  slides,
  titulo,
}: {
  slides: Slide[];
  titulo: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const palco = useRef<HTMLElement>(null);
  const [indice, setIndice] = useState(0);
  const slide = slides[indice];

  const ir = useCallback(
    (dir: number) => {
      setIndice((i) => Math.min(Math.max(i + dir, 0), slides.length - 1));
    },
    [slides.length],
  );

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "ArrowRight" || ev.key === "PageDown") ir(1);
      if (ev.key === "ArrowLeft" || ev.key === "PageUp") ir(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ir]);

  useGSAP(
    () => {
      registerMotion();
      if (!root.current) return;
      const mm = gsap.matchMedia();
      mm.add(
        {
          reduce: "(prefers-reduced-motion: reduce)",
          motion: "(prefers-reduced-motion: no-preference)",
        },
        (context) => {
          const reduce = Boolean(context.conditions?.reduce);
          if (reduce) {
            gsap.set(".js-slide-el", { autoAlpha: 1, y: 0 });
            return;
          }
          gsap.from(".js-slide-el", { y: 16, autoAlpha: 0, stagger: 0.06, duration: 0.45, ease: "power2.out" });
        },
      );
      return () => mm.revert();
    },
    { scope: root, dependencies: [indice], revertOnUpdate: true },
  );

  async function telaCheia() {
    const el = palco.current;
    if (!el) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await el.requestFullscreen();
  }

  if (!slide) {
    return <p className="text-sm text-muted">Sem slides para este recorte.</p>;
  }

  return (
    <div ref={root} className="space-y-4">
      <div className="no-print flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full bg-forest px-4 py-2 text-sm font-semibold text-white"
          onClick={() => void telaCheia()}
        >
          Tela cheia
        </button>
        <button
          type="button"
          className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold"
          onClick={() => window.print()}
        >
          Imprimir
        </button>
      </div>

      <section
        ref={palco}
        className="rounded-3xl border border-card-line bg-surface p-4 shadow-[var(--shadow-card)] sm:p-8 print:shadow-none"
        aria-label={titulo}
      >
        <p className="js-slide-el text-xs font-semibold uppercase tracking-[0.16em] text-forest sm:text-sm">{slide.kicker}</p>
        <h2 className="js-slide-el page-title">{slide.titulo}</h2>
        <dl className="mt-6 grid grid-cols-1 gap-3 sm:mt-8 sm:grid-cols-2">
          {slide.linhas.map((linha) => (
            <div key={`${linha.rotulo}-${linha.valor}`} className="js-slide-el rounded-2xl bg-page p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{linha.rotulo}</dt>
              <dd className="mt-1 text-sm font-semibold sm:text-base">{linha.valor}</dd>
            </div>
          ))}
        </dl>
        {slide.nota ? <p className="js-slide-el mt-6 text-sm text-muted">{slide.nota}</p> : null}
        <p className="js-slide-el mt-8 text-xs text-muted">
          Slide {indice + 1} de {slides.length}
        </p>
      </section>

      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold disabled:opacity-40"
          onClick={() => ir(-1)}
          disabled={indice === 0}
        >
          Anterior
        </button>
        <ol className="flex flex-wrap justify-center gap-1">
          {slides.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                className={`h-2.5 w-2.5 rounded-full ${i === indice ? "bg-forest" : "bg-line"}`}
                aria-label={`Ir para ${s.titulo}`}
                aria-current={i === indice ? "true" : undefined}
                onClick={() => setIndice(i)}
              />
            </li>
          ))}
        </ol>
        <button
          type="button"
          className="rounded-full bg-forest px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          onClick={() => ir(1)}
          disabled={indice === slides.length - 1}
        >
          Próximo
        </button>
      </div>

      <div className="hidden print:block">
        {slides.map((s) => (
          <section key={`print-${s.id}`} className="mb-10 break-after-page">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-forest">{s.kicker}</p>
            <h2 className="mt-2 text-2xl font-extrabold">{s.titulo}</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {s.linhas.map((linha) => (
                <li key={`${s.id}-${linha.rotulo}`}>
                  <strong>{linha.rotulo}:</strong> {linha.valor}
                </li>
              ))}
            </ul>
            {s.nota ? <p className="mt-3 text-sm text-muted">{s.nota}</p> : null}
          </section>
        ))}
      </div>
    </div>
  );
}
