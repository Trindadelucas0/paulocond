"use client";

import { useState } from "react";
import { formatBRL, formatNumero, mesLabel } from "@/lib/format";
import type { DetalheGrupo } from "@/lib/modulos";

export function DetalhamentoTabela({
  competencias,
  grupos,
}: {
  competencias: string[];
  grupos: DetalheGrupo[];
}) {
  const [grupoAberto, setGrupoAberto] = useState<string | null>(grupos[0] ? `${grupos[0].tipo}-${grupos[0].grupo}` : null);
  const [itemAberto, setItemAberto] = useState<string | null>(null);

  if (grupos.length === 0) {
    return <p className="text-sm text-muted">Sem lançamentos neste recorte.</p>;
  }

  const temMeses = grupos.some((g) => g.itens.some((i) => i.meses.length > 0));

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <caption className="sr-only">Detalhamento por categoria, item e competência</caption>
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <th className="py-2 pr-3 font-semibold">Categoria / item</th>
            <th className="py-2 pr-3 font-semibold">Tipo</th>
            <th className="py-2 text-right font-semibold">Total</th>
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
                itemAberto={itemAberto}
                temMeses={temMeses}
                competencias={competencias}
                onToggleGrupo={() => {
                  setGrupoAberto(aberto ? null : key);
                  setItemAberto(null);
                }}
                onToggleItem={(nome) => setItemAberto((atual) => (atual === nome ? null : nome))}
              />
            );
          })}
        </tbody>
      </table>
      {temMeses ? (
        <p className="mt-3 text-[11px] text-muted">Clique na categoria e no item para ver os meses. † = residual reconstruído.</p>
      ) : null}
    </div>
  );
}

function GrupoRows({
  grupo,
  aberto,
  itemAberto,
  temMeses,
  competencias,
  onToggleGrupo,
  onToggleItem,
}: {
  grupo: DetalheGrupo;
  aberto: boolean;
  itemAberto: string | null;
  temMeses: boolean;
  competencias: string[];
  onToggleGrupo: () => void;
  onToggleItem: (nome: string) => void;
}) {
  return (
    <>
      <tr className="border-b border-line bg-page/60">
        <th scope="row" className="py-2.5 pr-3">
          <button type="button" className="text-left font-bold" onClick={onToggleGrupo} aria-expanded={aberto}>
            {aberto ? "▾" : "▸"} {grupo.grupo}
          </button>
        </th>
        <td className="py-2.5 pr-3 text-muted">{grupo.tipo}</td>
        <td className="py-2.5 text-right font-bold">{formatBRL(grupo.totalCents)}</td>
      </tr>
      {aberto
        ? grupo.itens.map((item) => {
            const abertoItem = itemAberto === `${grupo.grupo}-${item.nome}`;
            return (
              <ItemRows
                key={item.nome}
                item={item}
                aberto={abertoItem}
                temMeses={temMeses}
                competencias={competencias}
                onToggle={() => onToggleItem(`${grupo.grupo}-${item.nome}`)}
              />
            );
          })
        : null}
    </>
  );
}

function ItemRows({
  item,
  aberto,
  temMeses,
  competencias,
  onToggle,
}: {
  item: DetalheGrupo["itens"][number];
  aberto: boolean;
  temMeses: boolean;
  competencias: string[];
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="border-b border-line/70">
        <th scope="row" className="py-2 pl-4 pr-3 font-medium">
          {temMeses ? (
            <button type="button" className="text-left" onClick={onToggle} aria-expanded={aberto}>
              {aberto ? "▾" : "▸"} {item.nome}
            </button>
          ) : (
            item.nome
          )}
        </th>
        <td className="py-2 pr-3 text-muted">{item.tipo}</td>
        <td className="py-2 text-right font-semibold">{formatBRL(item.totalCents)}</td>
      </tr>
      {aberto && temMeses ? (
        <tr>
          <td colSpan={3} className="bg-surface pb-4 pl-6 pr-2 pt-2">
            <div className="overflow-x-auto rounded-2xl border border-line">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-page text-muted">
                    {competencias.map((c) => (
                      <th key={c} className="whitespace-nowrap px-2 py-1.5 font-semibold">
                        {mesLabel(c)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {competencias.map((c) => {
                      const mes = item.meses.find((m) => m.competencia === c);
                      return (
                        <td key={c} className="whitespace-nowrap px-2 py-1.5 text-right">
                          {mes ? formatNumero(mes.valorCents) : "—"}
                          {mes?.origemValor === "RESIDUAL_MES_AUSENTE" ? " †" : ""}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
