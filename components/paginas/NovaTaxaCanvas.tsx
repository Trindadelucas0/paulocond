"use client";

import { useState } from "react";
import { RelatorioUnidadeFolha } from "@/components/paginas/RelatorioUnidadeFolha";
import { formatBRL, formatPercentualBp } from "@/lib/format";
import type { NovaTaxaIdealPayload } from "@/lib/nova-taxa-ideal";

export function NovaTaxaCanvas({ dados }: { dados: NovaTaxaIdealPayload }) {
  const [folha, setFolha] = useState(false);

  return (
    <div className="space-y-4 sm:space-y-5">
      <section
        className="js-block grid min-w-0 gap-3 rounded-3xl border border-card-line bg-surface p-4 shadow-[var(--shadow-card)] sm:grid-cols-2 sm:p-5"
        aria-labelledby="nova-taxa-titulo"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest">Taxa ideal</p>
          <h2 id="nova-taxa-titulo" className="mt-1 text-sm text-muted">
            Mês, condomínio inteiro
          </h2>
          <p
            className="mt-2 font-extrabold tabular-nums tracking-tight text-forest"
            style={{ fontSize: "clamp(1.7rem, 1.1rem + 2.2vw, 2.5rem)" }}
          >
            {formatBRL(dados.valorIdealMensalCents)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest">Por unidade</p>
          <h3 className="mt-1 text-sm text-muted">÷ {dados.unidades} unidades</h3>
          <p
            className="mt-2 font-extrabold tabular-nums tracking-tight"
            style={{ fontSize: "clamp(1.7rem, 1.1rem + 2.2vw, 2.5rem)" }}
          >
            {formatBRL(dados.porUnidadeCents)}
          </p>
        </div>
      </section>

      <article className="js-block min-w-0 rounded-3xl border border-card-line bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5">
        <h2 className="text-lg font-bold">Composição da taxa ideal</h2>
        <p className="mt-1 text-sm text-muted">
          Médias dos meses com valor. Set/2026 fica de fora (mesmo critério da média de cobertura). Pró-labore do
          síndico sai do grupo Contratos fixos para não ser contado duas vezes.
        </p>
        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">(+) Contratos fixos (sem pró-labore)</dt>
            <dd className="font-semibold tabular-nums">{formatBRL(dados.contratosFixosMediaCents)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">(+) Síndico (pró-labore)</dt>
            <dd className="font-semibold tabular-nums">{formatBRL(dados.sindicoMediaCents)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">(+) Manutenção</dt>
            <dd className="font-semibold tabular-nums">{formatBRL(dados.manutencaoMediaCents)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">
              (+) Inadimplência ({formatPercentualBp(dados.inadimplenciaMarkupBp)} sobre a soma)
            </dt>
            <dd className="font-semibold tabular-nums">{formatBRL(dados.inadimplenciaCents)}</dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-line pt-3">
            <dt className="font-semibold">= Valor ideal mensal</dt>
            <dd className="font-extrabold tabular-nums">{formatBRL(dados.valorIdealMensalCents)}</dd>
          </div>
        </dl>
      </article>

      <p className="text-sm text-muted">
        Cada uma das {dados.unidades} unidades = {formatBRL(dados.porUnidadeCents)}.
      </p>

      <div>
        <button
          type="button"
          className="min-h-11 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-forest"
          onClick={() => setFolha(true)}
        >
          Relatório por unidade
        </button>
      </div>

      <RelatorioUnidadeFolha
        aberta={folha}
        porUnidadeCents={dados.porUnidadeCents}
        unidades={dados.unidades}
        onClose={() => setFolha(false)}
      />
    </div>
  );
}
