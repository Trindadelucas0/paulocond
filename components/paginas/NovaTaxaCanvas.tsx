"use client";

import { useEffect, useMemo, useState } from "react";
import { RelatorioUnidadeFolha } from "@/components/paginas/RelatorioUnidadeFolha";
import { CardExportavel } from "@/components/paginas/CardExportavel";
import { filtrarUnidades, ratearPorFracao } from "@/lib/fracao-ideal";
import { formatBRL, formatPercentualBp } from "@/lib/format";
import {
  AJUSTE_PCT_MAX,
  AJUSTE_PCT_MIN,
  ajustePctValido,
  simularAnoTaxa,
  type NovaTaxaIdealPayload,
} from "@/lib/nova-taxa-ideal";

type BaseLista = "atual" | "simulada";

function parseAjustePct(texto: string): number | null {
  const t = texto.trim().replace(/\s/g, "").replace("%", "").replace(",", ".");
  if (t === "" || t === "-" || t === "+" || t === "." || t === "-." || t === "+.") return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return n;
}

function formatAjusteCampo(pct: number): string {
  return String(pct).replace(".", ",");
}

function formatFracaoPct(fracao: number): string {
  return `${(fracao * 100).toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}%`;
}

export function NovaTaxaCanvas({ dados }: { dados: NovaTaxaIdealPayload }) {
  const [folha, setFolha] = useState(false);
  const [ajusteTexto, setAjusteTexto] = useState("0");
  const [ajusteAplicado, setAjusteAplicado] = useState(0);
  const [erroAjuste, setErroAjuste] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");
  const [baseLista, setBaseLista] = useState<BaseLista>("atual");
  const [selecionada, setSelecionada] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setBuscaDebounced(busca), 150);
    return () => window.clearTimeout(id);
  }, [busca]);

  useEffect(() => {
    const parsed = parseAjustePct(ajusteTexto);
    const id = window.setTimeout(() => {
      if (parsed === null) {
        setErroAjuste(ajusteTexto.trim() === "" || ajusteTexto.trim() === "-" ? null : "Use um número entre −50 e 100.");
        return;
      }
      if (!ajustePctValido(parsed)) {
        setErroAjuste("Use um número entre −50 e 100.");
        return;
      }
      setErroAjuste(null);
      setAjusteAplicado(parsed);
      if (parsed !== 0) setBaseLista("simulada");
    }, 150);
    return () => window.clearTimeout(id);
  }, [ajusteTexto]);

  const simulado = useMemo(() => simularAnoTaxa(dados, ajusteAplicado), [dados, ajusteAplicado]);

  const totalListaCents = baseLista === "simulada" && simulado ? simulado.taxaSimCents : dados.valorIdealMensalCents;
  const rotuloBase = baseLista === "simulada" ? "ano simulado" : "taxa ideal atual";
  const porUnidadeIgualitario =
    baseLista === "simulada" && simulado ? simulado.porUnidadeSimCents : dados.porUnidadeCents;

  const linhas = useMemo(
    () => ratearPorFracao(totalListaCents, dados.porFracao.linhas),
    [totalListaCents, dados.porFracao.linhas],
  );
  const linhasFiltradas = useMemo(() => filtrarUnidades(linhas, buscaDebounced), [linhas, buscaDebounced]);
  const detalhe = selecionada ? linhas.find((l) => l.codigo === selecionada) : undefined;

  function aplicarPasso(delta: number) {
    const atual = parseAjustePct(ajusteTexto);
    const base = atual !== null && ajustePctValido(atual) ? atual : ajusteAplicado;
    const proximo = Math.min(AJUSTE_PCT_MAX, Math.max(AJUSTE_PCT_MIN, Math.round((base + delta) * 100) / 100));
    setAjusteTexto(formatAjusteCampo(proximo));
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <CardExportavel as="section" className="js-block" titulo="Taxa ideal e igualitário" aria-labelledby="nova-taxa-titulo">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest">Taxa ideal (atual)</p>
          <h2 id="nova-taxa-titulo" className="mt-1 text-sm text-muted">
            Mês, condomínio inteiro · sem Impostos
          </h2>
          <p
            className="mt-2 font-extrabold tabular-nums tracking-tight text-forest"
            style={{ fontSize: "clamp(1.7rem, 1.1rem + 2.2vw, 2.5rem)" }}
          >
            {formatBRL(dados.valorIdealMensalCents)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest">Igualitário atual</p>
          <h3 className="mt-1 text-sm text-muted">÷ {dados.unidades} unidades</h3>
          <p
            className="mt-2 font-extrabold tabular-nums tracking-tight"
            style={{ fontSize: "clamp(1.7rem, 1.1rem + 2.2vw, 2.5rem)" }}
          >
            {formatBRL(dados.porUnidadeCents)}
          </p>
        </div>
        </div>
      </CardExportavel>

      <CardExportavel as="article" className="js-block" titulo="Composição da taxa ideal">
        <h2 className="text-lg font-bold">Composição da taxa ideal</h2>
        <p className="mt-1 text-sm text-muted">
          Médias dos meses com valor. Set/2026 fica de fora (mesmo critério da média de cobertura). Pró-labore do
          síndico sai do grupo Contratos fixos para não ser contado duas vezes. Impostos não entram neste total.
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
      </CardExportavel>

      <CardExportavel as="article" className="js-block" titulo="Ano simulado">
        <h2 className="text-lg font-bold">Ano simulado</h2>
        <p className="mt-1 text-sm text-muted">
          Um percentual (positivo ou negativo) sobre Contratos fixos e Impostos. Síndico e manutenção ficam iguais. O
          4,56% recai sobre a nova base. Com 0%, a taxa simulada ainda inclui Impostos (fora da taxa ideal atual).
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="block min-w-0 flex-1 text-sm font-semibold" htmlFor="ajuste-pct">
            Ajuste sobre Contratos fixos e Impostos
            <span className="mt-2 flex items-center gap-2">
              <button
                type="button"
                className="min-h-11 min-w-11 rounded-full border border-line bg-surface text-lg font-bold"
                aria-label="Diminuir um ponto percentual"
                onClick={() => aplicarPasso(-1)}
              >
                −
              </button>
              <input
                id="ajuste-pct"
                className="min-h-11 w-full min-w-0 rounded-full border border-line bg-page px-4 tabular-nums"
                inputMode="decimal"
                autoComplete="off"
                value={ajusteTexto}
                aria-invalid={erroAjuste ? true : undefined}
                aria-describedby={erroAjuste ? "ajuste-pct-erro" : "ajuste-pct-ajuda"}
                onChange={(e) => setAjusteTexto(e.target.value)}
              />
              <span className="shrink-0 text-muted">%</span>
              <button
                type="button"
                className="min-h-11 min-w-11 rounded-full border border-line bg-surface text-lg font-bold"
                aria-label="Aumentar um ponto percentual"
                onClick={() => aplicarPasso(1)}
              >
                +
              </button>
            </span>
          </label>
        </div>
        <p id="ajuste-pct-ajuda" className="mt-2 text-xs text-muted">
          Faixa de {AJUSTE_PCT_MIN} a {AJUSTE_PCT_MAX}. Pode ser negativo.
        </p>
        {erroAjuste ? (
          <p id="ajuste-pct-erro" className="mt-1 text-sm text-danger" role="alert">
            {erroAjuste}
          </p>
        ) : null}

        {simulado ? (
          <>
            <div className="mt-5 grid gap-3 min-[480px]:grid-cols-3">
              <div className="rounded-2xl border border-line p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-forest">Taxa simulada</p>
                <p className="mt-1 text-lg font-extrabold tabular-nums">{formatBRL(simulado.taxaSimCents)}</p>
              </div>
              <div className="rounded-2xl border border-line p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-forest">÷ {dados.unidades} sim.</p>
                <p className="mt-1 text-lg font-extrabold tabular-nums">{formatBRL(simulado.porUnidadeSimCents)}</p>
              </div>
              <div className="rounded-2xl border border-line p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-forest">vs atual</p>
                <p className="mt-1 text-lg font-extrabold tabular-nums">
                  {simulado.vsAtualCents > 0 ? "+" : ""}
                  {formatBRL(simulado.vsAtualCents)}
                </p>
              </div>
            </div>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Contratos (sem pró-labore)</dt>
                <dd className="tabular-nums">
                  {formatBRL(dados.contratosFixosMediaCents)} → {formatBRL(simulado.contratosSimCents)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Impostos</dt>
                <dd className="tabular-nums">
                  {formatBRL(dados.impostosMediaCents)} → {formatBRL(simulado.impostosSimCents)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Síndico / manutenção</dt>
                <dd className="tabular-nums">
                  {formatBRL(simulado.sindicoSimCents)} / {formatBRL(simulado.manutencaoSimCents)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Inadimplência 4,56% (nova base)</dt>
                <dd className="tabular-nums">{formatBRL(simulado.inadimplenciaSimCents)}</dd>
              </div>
            </dl>
          </>
        ) : null}
      </CardExportavel>

      <CardExportavel as="article" className="js-block" titulo="Por fração ideal">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold">Por fração ideal</h2>
            <p className="mt-1 text-sm text-muted">
              {dados.porFracao.unidades} unidades (124 aptos + 12 vagas). Valores: {rotuloBase}.
            </p>
          </div>
          <div className="flex min-h-11 rounded-full border border-line p-1" role="group" aria-label="Base do rateio">
            <button
              type="button"
              className={`min-h-11 flex-1 rounded-full px-3 text-sm font-semibold sm:flex-none ${
                baseLista === "atual" ? "bg-forest text-white" : "text-forest"
              }`}
              aria-pressed={baseLista === "atual"}
              onClick={() => setBaseLista("atual")}
            >
              Taxa atual
            </button>
            <button
              type="button"
              className={`min-h-11 flex-1 rounded-full px-3 text-sm font-semibold sm:flex-none ${
                baseLista === "simulada" ? "bg-forest text-white" : "text-forest"
              }`}
              aria-pressed={baseLista === "simulada"}
              onClick={() => setBaseLista("simulada")}
            >
              Ano simulado
            </button>
          </div>
        </div>

        <label className="mt-4 block text-sm font-semibold" htmlFor="busca-unidade">
          Buscar unidade
          <input
            id="busca-unidade"
            className="mt-2 min-h-11 w-full rounded-full border border-line bg-page px-4"
            placeholder="Ex.: 101 ou V055"
            value={busca}
            autoComplete="off"
            onChange={(e) => setBusca(e.target.value)}
          />
        </label>

        {detalhe ? (
          <div className="mt-4 rounded-2xl border border-card-line p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-forest">Unidade {detalhe.codigo}</p>
                <p className="mt-1 text-sm text-muted">
                  Fração {detalhe.fracao.toLocaleString("pt-BR", { maximumFractionDigits: 6 })} (
                  {formatFracaoPct(detalhe.fracao)})
                </p>
                <p className="mt-2 text-xl font-extrabold tabular-nums">{formatBRL(detalhe.valorCents)}</p>
                <p className="mt-1 text-sm text-muted">
                  Igualitário {formatBRL(porUnidadeIgualitario)} · diferença{" "}
                  {formatBRL(detalhe.valorCents - porUnidadeIgualitario)}
                </p>
              </div>
              <button
                type="button"
                className="min-h-11 rounded-full border border-line px-3 text-sm"
                onClick={() => setSelecionada(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-3 font-semibold">Unidade</th>
                <th className="hidden py-2 pr-3 font-semibold sm:table-cell">Fração %</th>
                <th className="py-2 text-right font-semibold">Valor</th>
              </tr>
            </thead>
            <tbody>
              {linhasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-6 text-muted">
                    Nenhuma unidade com esse código.
                  </td>
                </tr>
              ) : (
                linhasFiltradas.map((l) => (
                  <tr key={l.codigo} className="border-b border-line">
                    <td className="py-1.5 pr-3">
                      <button
                        type="button"
                        className="min-h-11 text-left font-semibold text-forest"
                        onClick={() => setSelecionada(l.codigo)}
                      >
                        {l.codigo}
                      </button>
                    </td>
                    <td className="hidden py-1.5 pr-3 tabular-nums text-muted sm:table-cell">
                      {formatFracaoPct(l.fracao)}
                    </td>
                    <td className="py-1.5 text-right tabular-nums font-semibold">{formatBRL(l.valorCents)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-muted">
          Igualitário ÷ {dados.unidades} na base da lista: {formatBRL(porUnidadeIgualitario)}.
        </p>

        <div className="mt-4">
          <button
            type="button"
            className="min-h-11 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-forest"
            onClick={() => setFolha(true)}
          >
            Relatório por unidade
          </button>
        </div>
      </CardExportavel>

      <RelatorioUnidadeFolha
        aberta={folha}
        linhas={linhas}
        totalCents={totalListaCents}
        rotuloBase={rotuloBase}
        onClose={() => setFolha(false)}
      />
    </div>
  );
}
