import type { Periodo, TotalOficial } from "@prisma/client";
import {
  COMPETENCIAS_JAN_JUL_2025,
  COMPETENCIAS_JAN_JUL_2026,
  type RecorteId,
} from "@/lib/format";
import type { LancamentoComRel } from "@/lib/kpis";

export function noRecorte(l: LancamentoComRel, recorte: RecorteId): boolean {
  if (recorte === "oficial-2025") return l.origem === "PLANILHA_2025";
  if (recorte === "equivalente-jan-jul") {
    return l.origem === "PLANILHA_2026" && (COMPETENCIAS_JAN_JUL_2026 as readonly string[]).includes(l.periodo.competencia);
  }
  return l.origem === "PLANILHA_2026";
}

export function periodosDoRecorte(periodos: Periodo[], recorte: RecorteId): Periodo[] {
  return periodos
    .filter((p) => {
      if (recorte === "oficial-2025") return p.origem === "PLANILHA_2025";
      if (recorte === "equivalente-jan-jul") {
        return p.origem === "PLANILHA_2026" && (COMPETENCIAS_JAN_JUL_2026 as readonly string[]).includes(p.competencia);
      }
      return p.origem === "PLANILHA_2026";
    })
    .sort((a, b) => a.competencia.localeCompare(b.competencia));
}

export function somaTipo(lista: LancamentoComRel[], tipo: "RECEITA" | "DESPESA"): number {
  return lista.filter((l) => l.tipo === tipo).reduce((a, l) => a + l.valorCents, 0);
}

export function somaNome(lista: LancamentoComRel[], nome: string, tipo?: "RECEITA" | "DESPESA"): number {
  return lista
    .filter((l) => l.categoria.nome === nome && (!tipo || l.tipo === tipo))
    .reduce((a, l) => a + l.valorCents, 0);
}

export function somaGrupo(lista: LancamentoComRel[], grupo: string, tipo?: "RECEITA" | "DESPESA"): number {
  return lista
    .filter((l) => l.categoria.grupo === grupo && (!tipo || l.tipo === tipo))
    .reduce((a, l) => a + l.valorCents, 0);
}

export function somaNatureza(lista: LancamentoComRel[], natureza: string, tipo: "RECEITA" | "DESPESA"): number {
  return lista
    .filter((l) => l.tipo === tipo && l.categoria.natureza === natureza)
    .reduce((a, l) => a + l.valorCents, 0);
}

export function catInclui(nome: string, ...trechos: string[]): boolean {
  const n = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return trechos.some((t) => n.includes(t));
}

export function rankingItens(
  lista: LancamentoComRel[],
  tipo: "RECEITA" | "DESPESA",
  ordem: "valor" | "nome" = "valor",
) {
  const map = new Map<string, { nome: string; grupo: string; valorCents: number }>();
  for (const l of lista.filter((x) => x.tipo === tipo)) {
    const cur = map.get(l.categoriaId) ?? { nome: l.categoria.nome, grupo: l.categoria.grupo, valorCents: 0 };
    cur.valorCents += l.valorCents;
    map.set(l.categoriaId, cur);
  }
  const total = [...map.values()].reduce((a, i) => a + i.valorCents, 0);
  const rows = [...map.values()].map((i) => ({
    ...i,
    participacao: total === 0 ? 0 : i.valorCents / total,
  }));
  if (ordem === "nome") return rows.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  return rows.sort((a, b) => Math.abs(b.valorCents) - Math.abs(a.valorCents));
}

export function composicaoGrupo(lista: LancamentoComRel[], tipo: "RECEITA" | "DESPESA") {
  const map = new Map<string, number>();
  for (const l of lista.filter((x) => x.tipo === tipo)) {
    map.set(l.categoria.grupo, (map.get(l.categoria.grupo) ?? 0) + l.valorCents);
  }
  const total = [...map.values()].reduce((a, b) => a + b, 0);
  return [...map.entries()]
    .map(([grupo, valorCents]) => ({
      grupo,
      valorCents,
      participacao: total === 0 ? 0 : valorCents / total,
    }))
    .sort((a, b) => Math.abs(b.valorCents) - Math.abs(a.valorCents));
}

export function serieMensalTipo(lista: LancamentoComRel[], periodos: Periodo[], tipo?: "RECEITA" | "DESPESA") {
  return periodos.map((p) => {
    const rec = lista.filter((l) => l.periodoId === p.id && l.tipo === "RECEITA").reduce((a, l) => a + l.valorCents, 0);
    const des = lista.filter((l) => l.periodoId === p.id && l.tipo === "DESPESA").reduce((a, l) => a + l.valorCents, 0);
    const foco = tipo === "DESPESA" ? des : tipo === "RECEITA" ? rec : rec - des;
    return {
      competencia: p.competencia,
      receitaCents: rec,
      despesaCents: des,
      resultadoCents: rec - des,
      saldoCents: p.saldoFinalCents ?? 0,
      valorCents: foco,
      qualidade: p.qualidade,
    };
  });
}

export function totaisRecorte(
  recorte: RecorteId,
  totais: TotalOficial[],
  filtrados: LancamentoComRel[],
  periodos: Periodo[],
) {
  const oficial2026 = totais.find((t) => t.origem === "PLANILHA_2026");
  const oficial2025 = totais.find((t) => t.origem === "PLANILHA_2025");
  if (!oficial2026 || !oficial2025) {
    throw new Error("Totais oficiais ausentes.");
  }
  if (recorte === "oficial-2025") {
    return {
      receita: oficial2025.receitaCents,
      despesa: oficial2025.despesaCents,
      resultado: oficial2025.resultadoCents,
      saldoInicial: oficial2025.saldoInicialCents,
      saldoFinal: oficial2025.saldoFinalCents,
      rotulo: oficial2025.rotulo,
      criterio: "COLUNA_B" as const,
      oficial2026,
      oficial2025,
    };
  }
  if (recorte === "equivalente-jan-jul") {
    const rec = somaTipo(filtrados, "RECEITA");
    const des = somaTipo(filtrados, "DESPESA");
    const primeiro = periodos.find((p) => p.competencia === "2026-01");
    const ultimo = periodos.find((p) => p.competencia === "2026-07");
    return {
      receita: rec,
      despesa: des,
      resultado: rec - des,
      saldoInicial: primeiro?.saldoAnteriorCents ?? 0,
      saldoFinal: ultimo?.saldoFinalCents ?? rec - des,
      rotulo: "Jan/2026 até Jul/2026",
      criterio: "SOMA_MESES_EQUIVALENTES" as const,
      oficial2026,
      oficial2025,
    };
  }
  return {
    receita: oficial2026.receitaCents,
    despesa: oficial2026.despesaCents,
    resultado: oficial2026.resultadoCents,
    saldoInicial: oficial2026.saldoInicialCents,
    saldoFinal: oficial2026.saldoFinalCents,
    rotulo: oficial2026.rotulo,
    criterio: "COLUNA_B" as const,
    oficial2026,
    oficial2025,
  };
}

export function janJul(lancamentos: LancamentoComRel[], ano: 2025 | 2026) {
  const set = new Set<string>(ano === 2025 ? COMPETENCIAS_JAN_JUL_2025 : COMPETENCIAS_JAN_JUL_2026);
  const origem = ano === 2025 ? "PLANILHA_2025" : "PLANILHA_2026";
  return lancamentos.filter((l) => l.origem === origem && set.has(l.periodo.competencia));
}
