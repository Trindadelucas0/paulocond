"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VisaoGeralPayload } from "@/lib/kpis";
import { formatBRL, formatPct, mesLabel, RECORTE_OPCOES, type RecorteId } from "@/lib/format";
import { gsap, registerMotion, SplitText, useGSAP } from "@/lib/motion";
import { AreaChartSaldo } from "./AreaChartSaldo";
import { BarrasMensais } from "./BarrasMensais";
import { Composicao } from "./Composicao";
import { OrigemDrawer, type OrigemData } from "./OrigemDrawer";

export function VisaoGeral() {
  const root = useRef<HTMLDivElement>(null);
  const [recorte, setRecorte] = useState<RecorteId>("oficial-2026");
  const [data, setData] = useState<VisaoGeralPayload | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [origem, setOrigem] = useState<OrigemData | null>(null);
  const [origemAberta, setOrigemAberta] = useState(false);
  const [mesFoco, setMesFoco] = useState<string | null>(null);

  const carregar = useCallback(async (r: RecorteId) => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/visao-geral?recorte=${r}`);
      const json = (await res.json()) as {
        success: boolean;
        data?: VisaoGeralPayload;
        error?: { message: string };
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message ?? "Não foi possível carregar a visão geral.");
      }
      setData(json.data);
      const ultimo = json.data.serieMensal.at(-1)?.competencia ?? null;
      setMesFoco(ultimo);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar.");
      setData(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar(recorte);
  }, [carregar, recorte]);

  const abrirOrigem = useCallback(
    async (kpi: "saldo" | "receitas" | "despesas" | "resultado") => {
      const res = await fetch(`/api/origem?kpi=${kpi}&recorte=${recorte}`);
      const json = (await res.json()) as { success: boolean; data?: OrigemData; error?: { message: string } };
      if (!res.ok || !json.success || !json.data) return;
      setOrigem(json.data);
      setOrigemAberta(true);
    },
    [recorte],
  );

  useGSAP(
    () => {
      registerMotion();
      if (!data || !root.current) return;
      const mm = gsap.matchMedia();
      mm.add(
        {
          reduce: "(prefers-reduced-motion: reduce)",
          motion: "(prefers-reduced-motion: no-preference)",
        },
        (context) => {
          const reduce = Boolean(context.conditions?.reduce);
          const d = reduce ? 0 : 0.7;
          const title = root.current?.querySelector(".js-title");
          const kicker = root.current?.querySelector(".js-kicker");
          if (title && kicker && !reduce) {
            const splitK = SplitText.create(kicker, { type: "chars" });
            const splitT = SplitText.create(title, { type: "chars,words" });
            gsap.set([splitK.chars, splitT.chars], { y: 18, autoAlpha: 0 });
            const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
            tl.to(splitK.chars, { y: 0, autoAlpha: 1, stagger: 0.018, duration: 0.45 })
              .to(splitT.chars, { y: 0, autoAlpha: 1, stagger: 0.02, duration: 0.55 }, "-=0.2")
              .from(".js-seal", { autoAlpha: 0, y: 8, duration: 0.4 }, "<0.1")
              .from(".js-kpi", { y: 24, autoAlpha: 0, stagger: 0.08, duration: d }, "-=0.15")
              .from(".js-panel", { y: 28, autoAlpha: 0, stagger: 0.1, duration: 0.6 }, "-=0.3")
              .fromTo(".js-line", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut" }, "-=0.5");
          } else {
            gsap.set([".js-kicker", ".js-title", ".js-seal", ".js-kpi", ".js-panel"], { autoAlpha: 1, y: 0 });
          }

          root.current?.querySelectorAll<HTMLElement>("[data-cents]").forEach((el) => {
            const target = Number(el.dataset.cents);
            const obj = { val: reduce ? target : 0 };
            gsap.to(obj, {
              val: target,
              duration: reduce ? 0 : 1.1,
              ease: "power2.out",
              onUpdate: () => {
                el.textContent = formatBRL(Math.round(obj.val));
              },
            });
          });

          gsap.from(".js-bar", {
            scaleX: reduce ? 1 : 0,
            duration: reduce ? 0 : 0.7,
            stagger: 0.04,
            ease: "power2.out",
            delay: reduce ? 0 : 0.4,
          });

          if (!reduce) {
            gsap.from(".js-alerts", {
              y: 24,
              autoAlpha: 0,
              duration: 0.6,
              scrollTrigger: { trigger: ".js-alerts", start: "top 80%", once: true },
            });
          }
        },
      );
      return () => mm.revert();
    },
    { scope: root, dependencies: [data], revertOnUpdate: true },
  );

  if (carregando && !data) {
    return (
      <div className="space-y-6" aria-busy="true" aria-live="polite">
        <div className="h-16 animate-pulse rounded-3xl border border-card-line bg-surface shadow-[var(--shadow-card)]" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-3xl border border-card-line bg-surface shadow-[var(--shadow-card)]" />
          ))}
        </div>
        <p className="text-sm text-muted">Carregando visão geral…</p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="rounded-3xl border border-card-line bg-surface p-8 shadow-[var(--shadow-card)]">
        <h1 className="text-2xl font-extrabold">Não foi possível carregar</h1>
        <p className="mt-2 text-muted">{erro}</p>
        <button
          type="button"
          className="mt-4 rounded-full bg-forest px-4 py-2 text-sm font-semibold text-white"
          onClick={() => void carregar(recorte)}
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-3xl border border-card-line bg-surface p-8 shadow-[var(--shadow-card)]">
        <h1 className="text-2xl font-extrabold">Sem dados importados</h1>
        <p className="mt-2 text-muted">Rode `npm run importar` e recarregue esta página.</p>
      </div>
    );
  }

  const kpis = [data.kpis.saldo, data.kpis.receitas, data.kpis.despesas, data.kpis.resultado];
  const foco = data.serieMensal.find((m) => m.competencia === mesFoco) ?? data.serieMensal.at(-1);

  return (
    <div ref={root} className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="js-kicker text-sm font-semibold uppercase tracking-[0.18em] text-forest">
            {data.condominio.nome}
          </p>
          <h1 className="js-title mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Visão geral</h1>
          <p className="mt-1 text-sm text-muted">Prestação de contas · {data.periodo.rotulo}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-line bg-surface p-1 shadow-[var(--shadow-card)]">
            {RECORTE_OPCOES.map((op) => (
              <button
                key={op.id}
                type="button"
                onClick={() => setRecorte(op.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold sm:text-sm ${
                  recorte === op.id ? "bg-forest text-white" : "text-muted"
                }`}
                aria-pressed={recorte === op.id}
              >
                {op.label}
              </button>
            ))}
          </div>
          <span className="js-seal rounded-full bg-forest-soft px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-forest">
            {data.periodo.selo}
          </span>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores">
        {kpis.map((kpi) => (
          <button
            key={kpi.id}
            type="button"
            className="js-kpi rounded-3xl border border-card-line bg-surface p-5 text-left shadow-[var(--shadow-card)] transition hover:-translate-y-0.5"
            onClick={() => {
              void abrirOrigem(kpi.id);
            }}
            data-kpi={kpi.id}
          >
            <p className="text-sm text-muted">{kpi.rotulo}</p>
            <p className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl" data-cents={kpi.valorCents}>
              {formatBRL(kpi.valorCents)}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {kpi.variacaoPct !== null ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    kpi.variacaoPct >= 0 ? "bg-forest-soft text-forest" : "bg-danger-soft text-danger"
                  }`}
                >
                  {formatPct(kpi.variacaoPct)}
                </span>
              ) : null}
              <span className="text-[11px] text-muted">{kpi.variacaoBase}</span>
            </div>
            {kpi.extra ? <p className="mt-3 text-xs text-muted">{kpi.extra}</p> : null}
          </button>
        ))}
      </section>
      <p className="text-xs text-muted">{data.saldoGerencialLabel}</p>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <article className="js-panel rounded-3xl border border-card-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Evolução do saldo</h2>
              <p className="text-sm text-muted">Saldo gerencial ao fim de cada competência</p>
            </div>
            {foco ? (
              <p className="rounded-full bg-forest-soft px-3 py-1 text-xs font-semibold text-forest">
                {mesLabel(foco.competencia)} · {formatBRL(data.serieSaldo.find((s) => s.competencia === foco.competencia)?.saldoCents ?? 0)}
              </p>
            ) : null}
          </div>
          <AreaChartSaldo serie={data.serieSaldo} foco={mesFoco} onFoco={setMesFoco} />
        </article>
        <article className="js-panel rounded-3xl border border-card-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
          <h2 className="text-lg font-bold">Composição das despesas</h2>
          <p className="mb-4 text-sm text-muted">Participação no total do recorte</p>
          <Composicao fatias={data.composicaoDespesas} />
        </article>
      </section>

      <section className="js-panel rounded-3xl border border-card-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
        <h2 className="text-lg font-bold">Receitas e despesas por mês</h2>
        <p className="mb-4 text-sm text-muted">Barras hachuradas; o mês em foco fica verde sólido. Set/2026 incompleto não entra em média.</p>
        <BarrasMensais serie={data.serieMensal} foco={mesFoco} onFoco={setMesFoco} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="js-panel rounded-3xl border border-card-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
          <h2 className="text-lg font-bold">Composição das receitas</h2>
          <Composicao fatias={data.composicaoReceitas} />
        </article>
        <article className="js-panel rounded-3xl border border-card-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
          <h2 className="text-lg font-bold">{data.comparativoJanJul.rotulo}</h2>
          <p className="mb-4 text-sm text-muted">Único comparativo da home: meses equivalentes, não 7 contra 12.</p>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-page p-4">
              <dt className="text-muted">2025</dt>
              <dd className="mt-2 font-bold">{formatBRL(data.comparativoJanJul.ano2025.receitaCents)}</dd>
              <dd className="text-muted">despesa {formatBRL(data.comparativoJanJul.ano2025.despesaCents)}</dd>
            </div>
            <div className="rounded-2xl bg-page p-4">
              <dt className="text-muted">2026</dt>
              <dd className="mt-2 font-bold">{formatBRL(data.comparativoJanJul.ano2026.receitaCents)}</dd>
              <dd className="text-muted">despesa {formatBRL(data.comparativoJanJul.ano2026.despesaCents)}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="js-alerts grid gap-4 lg:grid-cols-2">
        <article className="rounded-3xl border border-card-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
          <h2 className="text-lg font-bold">Pontos de atenção</h2>
          <ul className="mt-4 space-y-3">
            {data.alertas.map((alerta) => (
              <li
                key={alerta.id}
                className={`rounded-2xl px-4 py-3 text-sm ${
                  alerta.nivel === "atencao" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"
                }`}
              >
                {alerta.texto}
              </li>
            ))}
          </ul>
        </article>
        <article className="rounded-3xl border border-card-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
          <h2 className="text-lg font-bold">Qualidade dos dados</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {data.qualidade.map((q) => (
              <li key={q.codigo} className="flex gap-2">
                <span className={q.nivel === "ok" ? "text-forest" : "text-warning"} aria-hidden>
                  {q.nivel === "ok" ? "✓" : "⚠"}
                </span>
                {q.texto}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">
            Fonte: {data.fonte.arquivos.join(" · ")} · {data.statusDespesa}
          </p>
        </article>
      </section>

      <OrigemDrawer
        aberta={origemAberta}
        data={origem}
        onClose={() => {
          setOrigemAberta(false);
          setOrigem(null);
        }}
      />
    </div>
  );
}
