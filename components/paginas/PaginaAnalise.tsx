"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Composicao } from "@/components/visao-geral/Composicao";
import { BarrasMensais } from "@/components/visao-geral/BarrasMensais";
import { AreaChartSaldo } from "@/components/visao-geral/AreaChartSaldo";
import { BarrasValor } from "@/components/paginas/BarrasValor";
import { DetalhamentoTabela } from "@/components/paginas/DetalhamentoTabela";
import { KpiGrid } from "@/components/paginas/KpiGrid";
import { RankingLista } from "@/components/paginas/RankingLista";
import { RelatorioAssembleia } from "@/components/paginas/RelatorioAssembleia";
import { WaterfallChart } from "@/components/paginas/WaterfallChart";
import { RECORTE_OPCOES, formatBRL, formatPct, type ModuloId, type OrdemId, type RecorteId } from "@/lib/format";
import { gsap, registerMotion, SplitText, useGSAP } from "@/lib/motion";
import type { ModuloPayload } from "@/lib/modulos";

export function PaginaAnalise({ modulo }: { modulo: ModuloId }) {
  const root = useRef<HTMLDivElement>(null);
  const [recorte, setRecorte] = useState<RecorteId>("oficial-2026");
  const [ordem, setOrdem] = useState<OrdemId>("valor");
  const [data, setData] = useState<ModuloPayload | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [mesFoco, setMesFoco] = useState<string | null>(null);

  const carregar = useCallback(async (r: RecorteId, o: OrdemId) => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/modulo?modulo=${modulo}&recorte=${r}&ordem=${o}`);
      const json = (await res.json()) as {
        success: boolean;
        data?: ModuloPayload;
        error?: { message: string };
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message ?? "Não foi possível carregar este módulo.");
      }
      setData(json.data);
      setMesFoco(json.data.serie.at(-1)?.competencia ?? null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar.");
      setData(null);
    } finally {
      setCarregando(false);
    }
  }, [modulo]);

  useEffect(() => {
    void carregar(recorte, ordem);
  }, [carregar, recorte, ordem]);

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
          const title = root.current?.querySelector(".js-title");
          const kicker = root.current?.querySelector(".js-kicker");
          if (title && kicker && !reduce) {
            const splitK = SplitText.create(kicker, { type: "chars" });
            const splitT = SplitText.create(title, { type: "chars,words" });
            gsap.set([splitK.chars, splitT.chars], { y: 16, autoAlpha: 0 });
            const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
            tl.to(splitK.chars, { y: 0, autoAlpha: 1, stagger: 0.016, duration: 0.4 })
              .to(splitT.chars, { y: 0, autoAlpha: 1, stagger: 0.018, duration: 0.5 }, "-=0.2")
              .from(".js-block", { y: 22, autoAlpha: 0, stagger: 0.07, duration: 0.55 }, "-=0.15");
          } else {
            gsap.set([".js-kicker", ".js-title", ".js-block"], { autoAlpha: 1, y: 0 });
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
        <div className="h-16 animate-pulse rounded-3xl bg-surface shadow-[var(--shadow-card)]" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-3xl bg-surface shadow-[var(--shadow-card)]" />
          ))}
        </div>
        <p className="text-sm text-muted">Carregando…</p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="rounded-3xl bg-surface p-8 shadow-[var(--shadow-card)]">
        <h1 className="text-2xl font-extrabold">Não foi possível carregar</h1>
        <p className="mt-2 text-muted">{erro}</p>
        <button
          type="button"
          className="mt-4 rounded-full bg-forest px-4 py-2 text-sm font-semibold text-white"
          onClick={() => void carregar(recorte, ordem)}
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-3xl bg-surface p-8 shadow-[var(--shadow-card)]">
        <h1 className="text-2xl font-extrabold">Sem dados importados</h1>
        <p className="mt-2 text-muted">Rode `npm run importar` e recarregue esta página.</p>
      </div>
    );
  }

  const seriePar = data.modulo === "fluxo" || data.modulo === "analise-mensal" || data.modulo === "receitas" || data.modulo === "despesas" || data.modulo === "contratos" || data.modulo === "manutencao" || data.modulo === "utilidades" || data.modulo === "patrimonio" || data.modulo === "fundo-reserva";
  const serieUnica = data.modulo === "taxa-condominial" || data.modulo === "taxas-extras";

  return (
    <div ref={root} className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="js-kicker text-sm font-semibold uppercase tracking-[0.18em] text-forest">{data.kicker}</p>
          <h1 className="js-title mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{data.titulo}</h1>
          <p className="mt-1 text-sm text-muted">Prestação de contas · {data.periodo.rotulo}</p>
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
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
          <span className="rounded-full bg-forest-soft px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-forest">
            {data.periodo.selo}
          </span>
        </div>
      </header>

      {data.avisos.length > 0 ? (
        <ul className="js-block space-y-2">
          {data.avisos.map((aviso) => (
            <li key={aviso} className="rounded-2xl bg-warning-soft px-4 py-3 text-sm text-warning">
              {aviso}
            </li>
          ))}
        </ul>
      ) : null}

      <KpiGrid itens={data.kpis} />

      {data.waterfall.length > 0 ? <WaterfallChart passos={data.waterfall} /> : null}

      {data.destaques.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.destaques.map((d) => (
            <article key={d.id} className="js-block rounded-3xl border border-card-line bg-surface p-5 shadow-[var(--shadow-card)]">
              <p className="text-sm text-muted">{d.rotulo}</p>
              <p className="mt-2 text-xl font-extrabold">{formatBRL(d.valorCents)}</p>
              {d.extra ? (
                <p className="mt-2">
                  <span className="rounded-full bg-forest-soft px-2 py-0.5 text-xs font-bold text-forest">{d.extra}</span>
                </p>
              ) : null}
              {d.nota ? <p className="mt-3 text-xs text-muted">{d.nota}</p> : null}
            </article>
          ))}
        </section>
      ) : null}

      {data.composicao.length > 0 ? (
        <article className="js-block rounded-3xl border border-card-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
          <h2 className="text-lg font-bold">Composição</h2>
          <p className="mb-4 text-sm text-muted">Participação no total do recorte</p>
          <Composicao fatias={data.composicao} />
        </article>
      ) : null}

      {data.ranking.length > 0 || data.mostrarOrdem ? (
        <div className="space-y-3">
          {data.mostrarOrdem ? (
            <div className="no-print flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Ordenar ranking</p>
              {(["valor", "nome"] as const).map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => setOrdem(op)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    ordem === op ? "bg-forest text-white" : "border border-line bg-surface text-muted"
                  }`}
                  aria-pressed={ordem === op}
                >
                  {op === "valor" ? "Por valor" : "Por nome"}
                </button>
              ))}
            </div>
          ) : null}
          <RankingLista itens={data.ranking} rotulo={data.rankingRotulo} />
        </div>
      ) : null}

      {data.serie.length > 0 && seriePar ? (
        <article className="js-block rounded-3xl border border-card-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
          <h2 className="text-lg font-bold">{data.serieRotulo}</h2>
          <p className="mb-4 text-sm text-muted">Barras hachuradas. * parcial · † residual.</p>
          <BarrasMensais serie={data.serie} foco={mesFoco} onFoco={setMesFoco} />
        </article>
      ) : null}

      {data.serie.length > 0 && serieUnica ? (
        <article className="js-block rounded-3xl border border-card-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
          <h2 className="text-lg font-bold">{data.serieRotulo}</h2>
          <BarrasValor serie={data.serie} rotulo={data.serieRotulo} />
        </article>
      ) : null}

      {data.modulo === "fluxo" && data.serie.length > 0 ? (
        <article className="js-block rounded-3xl border border-card-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
          <h2 className="text-lg font-bold">Saldo gerencial ao fim de cada competência</h2>
          <AreaChartSaldo
            serie={data.serie.map((s) => ({ competencia: s.competencia, saldoCents: s.saldoCents, qualidade: s.qualidade }))}
            foco={mesFoco}
            onFoco={setMesFoco}
          />
        </article>
      ) : null}

      {data.comparativo ? (
        <article className="js-block rounded-3xl border border-card-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
          <h2 className="text-lg font-bold">{data.comparativo.rotulo}</h2>
          {data.comparativo.aviso ? (
            <p className="mt-2 rounded-2xl bg-warning-soft px-4 py-3 text-sm text-warning">{data.comparativo.aviso}</p>
          ) : null}
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3 font-semibold">Item</th>
                  <th className="py-2 pr-3 text-right font-semibold">Jan–Jul/2025</th>
                  <th className="py-2 pr-3 text-right font-semibold">Jan–Jul/2026</th>
                  <th className="py-2 text-right font-semibold">Variação</th>
                </tr>
              </thead>
              <tbody>
                {data.comparativo.linhas.map((linha) => (
                  <tr key={linha.rotulo} className="border-b border-line/70">
                    <th scope="row" className="py-2.5 pr-3 font-medium">
                      {linha.rotulo}
                    </th>
                    <td className="py-2.5 pr-3 text-right">{formatBRL(linha.cents2025)}</td>
                    <td className="py-2.5 pr-3 text-right font-semibold">{formatBRL(linha.cents2026)}</td>
                    <td className="py-2.5 text-right">
                      {linha.variacaoPct === null ? (
                        "—"
                      ) : (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            linha.variacaoPct >= 0 ? "bg-forest-soft text-forest" : "bg-danger-soft text-danger"
                          }`}
                        >
                          {formatPct(linha.variacaoPct)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      ) : null}

      {data.modulo === "analise-mensal" && data.detalhamento.grupos.length > 0 ? (
        <article className="js-block rounded-3xl border border-card-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
          <h2 className="text-lg font-bold">Receita, despesa, resultado e saldo por mês</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3 font-semibold">Mês</th>
                  <th className="py-2 pr-3 text-right font-semibold">Receitas</th>
                  <th className="py-2 pr-3 text-right font-semibold">Despesas</th>
                  <th className="py-2 pr-3 text-right font-semibold">Resultado</th>
                  <th className="py-2 text-right font-semibold">Saldo gerencial</th>
                </tr>
              </thead>
              <tbody>
                {data.detalhamento.grupos.map((g) => {
                  const rec = g.itens.find((i) => i.tipo === "RECEITA")?.totalCents ?? 0;
                  const des = g.itens.find((i) => i.tipo === "DESPESA")?.totalCents ?? 0;
                  const res = g.itens.find((i) => i.tipo === "RESULTADO")?.totalCents ?? 0;
                  const saldo = g.itens.find((i) => i.tipo === "SALDO")?.totalCents ?? 0;
                  return (
                    <tr key={g.grupo} className="border-b border-line/70">
                      <th scope="row" className="py-2.5 pr-3 font-medium">
                        {g.grupo}
                        {g.tipo === "PARCIAL" ? " *" : g.tipo === "RESIDUAL_MES_AUSENTE" ? " †" : ""}
                      </th>
                      <td className="py-2.5 pr-3 text-right">{formatBRL(rec)}</td>
                      <td className="py-2.5 pr-3 text-right">{formatBRL(des)}</td>
                      <td className="py-2.5 pr-3 text-right font-semibold">{formatBRL(res)}</td>
                      <td className="py-2.5 text-right">{formatBRL(saldo)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>
      ) : null}

      {data.modulo === "detalhamento" ? (
        <article className="js-block rounded-3xl border border-card-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
          <h2 className="text-lg font-bold">Categoria → item → meses</h2>
          <p className="mb-4 text-sm text-muted">Tabela tipo planilha. Totais oficiais continuam na coluna B, na Visão Geral.</p>
          <DetalhamentoTabela competencias={data.detalhamento.competencias} grupos={data.detalhamento.grupos} />
        </article>
      ) : null}

      {data.modulo === "alertas" ? (
        <article className="js-block rounded-3xl border border-card-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
          <h2 className="text-lg font-bold">Pontos de atenção</h2>
          {data.alertas.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nenhum alerta objetivo disparado neste conjunto de dados.</p>
          ) : (
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
          )}
        </article>
      ) : null}

      {data.modulo === "relatorio" ? <RelatorioAssembleia slides={data.slides} titulo={data.titulo} /> : null}

      {data.config ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="js-block rounded-3xl border border-card-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
            <h2 className="text-lg font-bold">Condomínio</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Nome</dt>
                <dd className="font-semibold">{data.config.condominio.nome}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Código</dt>
                <dd className="font-semibold">{data.config.condominio.codigo}</dd>
              </div>
            </dl>
            <p className="mt-4 text-sm text-muted">{data.config.login}</p>
          </article>
          <article className="js-block rounded-3xl border border-card-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
            <h2 className="text-lg font-bold">Fonte e período</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {data.config.periodos.map((per) => (
                <li key={per.origem}>
                  <span className="font-semibold">{per.rotulo}</span>
                  <span className="block text-muted">{per.origem} · {per.qualidade}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted">{data.config.fonte.join(" · ")}</p>
          </article>
          <article className="js-block rounded-3xl border border-card-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
            <h2 className="text-lg font-bold">Qualidade dos dados</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {data.config.qualidade.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
            <p className="mt-4 rounded-2xl bg-warning-soft px-4 py-3 text-sm text-warning">{data.config.pagamento}</p>
          </article>
          <article className="js-block rounded-3xl border border-card-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
            <h2 className="text-lg font-bold">Atualizar dados</h2>
            <p className="mt-3 text-sm text-muted">{data.config.importador}</p>
            <p className="mt-4 rounded-2xl bg-page px-4 py-3 font-mono text-sm">npm run importar</p>
          </article>
        </div>
      ) : null}

      <p className="text-xs text-muted">
        {data.statusDespesa} · {data.criterio === "COLUNA_B" ? "KPI oficial = coluna B" : "Totais = soma dos meses equivalentes"} ·{" "}
        {data.fonte.arquivos.join(" · ")}
      </p>
    </div>
  );
}
