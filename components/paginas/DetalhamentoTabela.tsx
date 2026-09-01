"use client";

import { useState } from "react";
import { formatBRL, formatNumero, mesLabel } from "@/lib/format";
import type { DetalheGrupo } from "@/lib/modulos";

type DetalheItem = DetalheGrupo["itens"][number];

type MesValor = {
  valorCents: number;
  residual: boolean;
};

function valorMesItem(item: DetalheItem, competencia: string): MesValor | null {
  const mes = item.meses.find((m) => m.competencia === competencia);
  if (!mes) return null;
  return {
    valorCents: mes.valorCents,
    residual: mes.origemValor === "RESIDUAL_MES_AUSENTE",
  };
}

function valorMesGrupo(grupo: DetalheGrupo, competencia: string): MesValor | null {
  let valorCents = 0;
  let residual = false;
  let temDado = false;
  for (const item of grupo.itens) {
    const v = valorMesItem(item, competencia);
    if (v) {
      temDado = true;
      valorCents += v.valorCents;
      if (v.residual) residual = true;
    }
  }
  if (!temDado) return null;
  return { valorCents, residual };
}

function CelulaMes({ valor, bold }: { valor: MesValor | null; bold?: boolean }) {
  return (
    <td
      className={`whitespace-nowrap px-2 py-2.5 text-right tabular-nums ${bold ? "font-bold" : "font-medium"}`}
    >
      {valor ? (
        <>
          {formatNumero(valor.valorCents)}
          {valor.residual ? " †" : ""}
        </>
      ) : (
        <span className="text-muted">—</span>
      )}
    </td>
  );
}

export function DetalhamentoTabela({
  competencias,
  grupos,
}: {
  competencias: string[];
  grupos: DetalheGrupo[];
}) {
  const [grupoAberto, setGrupoAberto] = useState<string | null>(
    grupos[0] ? `${grupos[0].tipo}-${grupos[0].grupo}` : null,
  );

  if (grupos.length === 0) {
    return <p className="text-sm text-muted">Sem lançamentos neste recorte.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <caption className="sr-only">Detalhamento por categoria, item e competência</caption>
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <th className="sticky left-0 z-20 min-w-[10rem] bg-surface py-2 pr-3 font-semibold sm:min-w-[12rem]">
              Categoria / item
            </th>
            <th className="py-2 pr-3 font-semibold">Tipo</th>
            {competencias.map((c) => (
              <th key={c} className="whitespace-nowrap px-2 py-2 text-right font-semibold">
                {mesLabel(c)}
              </th>
            ))}
            <th className="sticky right-0 z-20 bg-surface py-2 pl-3 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {grupos.map((grupo) => {
            const key = `${grupo.tipo}-${grupo.grupo}`;
            const aberto = grupoAberto === key;
            return (
              <GrupoRows
                key={key}
                grupo={grupo}
                aberto={aberto}
                competencias={competencias}
                onToggleGrupo={() => setGrupoAberto(aberto ? null : key)}
              />
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-[11px] text-muted">
        Expanda a categoria para ver os itens. † = residual reconstruído. Totais oficiais continuam na coluna B, na
        Visão Geral.
      </p>
    </div>
  );
}

function GrupoRows({
  grupo,
  aberto,
  competencias,
  onToggleGrupo,
}: {
  grupo: DetalheGrupo;
  aberto: boolean;
  competencias: string[];
  onToggleGrupo: () => void;
}) {
  return (
    <>
      <tr className="border-b border-line bg-page/60">
        <th
          scope="row"
          className="sticky left-0 z-10 min-w-[10rem] bg-page/95 py-2.5 pr-3 backdrop-blur-sm sm:min-w-[12rem]"
        >
          <button type="button" className="text-left font-bold" onClick={onToggleGrupo} aria-expanded={aberto}>
            {aberto ? "▾" : "▸"} {grupo.grupo}
          </button>
        </th>
        <td className="py-2.5 pr-3 text-muted">{grupo.tipo}</td>
        {competencias.map((c) => (
          <CelulaMes key={c} valor={valorMesGrupo(grupo, c)} bold />
        ))}
        <td className="sticky right-0 z-10 bg-page/95 py-2.5 pl-3 text-right font-bold tabular-nums backdrop-blur-sm">
          {formatBRL(grupo.totalCents)}
        </td>
      </tr>
      {aberto
        ? grupo.itens.map((item) => (
            <tr key={item.nome} className="border-b border-line/70">
              <th
                scope="row"
                className="sticky left-0 z-10 min-w-[10rem] bg-surface py-2 pl-4 pr-3 font-medium sm:min-w-[12rem]"
              >
                {item.nome}
              </th>
              <td className="py-2 pr-3 text-muted">{item.tipo}</td>
              {competencias.map((c) => (
                <CelulaMes key={c} valor={valorMesItem(item, c)} />
              ))}
              <td className="sticky right-0 z-10 bg-surface py-2 pl-3 text-right font-semibold tabular-nums">
                {formatBRL(item.totalCents)}
              </td>
            </tr>
          ))
        : null}
    </>
  );
}
