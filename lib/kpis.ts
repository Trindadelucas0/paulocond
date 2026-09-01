import type { Categoria, Lancamento, Periodo, TotalOficial } from "@prisma/client";
import {
  COMPETENCIAS_JAN_JUL_2025,
  COMPETENCIAS_JAN_JUL_2026,
  type RecorteId,
} from "@/lib/format";
import { SALDO_INICIAL_CENTS } from "@/lib/money";

export type LancamentoComRel = Lancamento & {
  categoria: Categoria;
  periodo: Periodo;
};

export type VisaoGeralPayload = {
  condominio: { nome: string; codigo: string };
  recorte: RecorteId;
  periodo: {
    rotulo: string;
    inicio: string;
    fim: string;
    selo: "REALIZADO";
    qualidade: string;
  };
  kpis: {
    saldo: KpiCard;
    receitas: KpiCard;
    despesas: KpiCard;
    resultado: KpiCard;
  };
  margem: number | null;
  coberturaMeses: number | null;
  saldoGerencialLabel: string;
  serieSaldo: { competencia: string; saldoCents: number; qualidade: string }[];
  serieMensal: {
    competencia: string;
    receitaCents: number;
    despesaCents: number;
    resultadoCents: number;
    qualidade: string;
    origemValor: string;
  }[];
  composicaoReceitas: Fatia[];
  composicaoDespesas: Fatia[];
  comparativoJanJul: {
    rotulo: string;
    ano2025: { receitaCents: number; despesaCents: number; resultadoCents: number };
    ano2026: { receitaCents: number; despesaCents: number; resultadoCents: number };
  };
  alertas: Alerta[];
  qualidade: { codigo: string; nivel: "ok" | "aviso" | "atencao"; texto: string }[];
  statusDespesa: "Despesa registrada";
  fonte: { arquivos: string[]; atualizadoEm: string };
};

type KpiCard = {
  id: "saldo" | "receitas" | "despesas" | "resultado";
  rotulo: string;
  valorCents: number;
  variacaoPct: number | null;
  variacaoBase: string;
  extra?: string;
};

export type Fatia = {
  grupo: string;
  valorCents: number;
  participacao: number;
};

export type Alerta = {
  id: string;
  nivel: "atencao" | "aviso";
  texto: string;
};

function sumTipo(
  lancamentos: LancamentoComRel[],
  tipo: "RECEITA" | "DESPESA",
  competencias?: Set<string>,
) {
  return lancamentos
    .filter((l) => l.tipo === tipo && (!competencias || competencias.has(l.periodo.competencia)))
    .reduce((acc, l) => acc + l.valorCents, 0);
}

function composicao(
  lancamentos: LancamentoComRel[],
  tipo: "RECEITA" | "DESPESA",
  competencias?: Set<string>,
): Fatia[] {
  const map = new Map<string, number>();
  for (const l of lancamentos) {
    if (l.tipo !== tipo) continue;
    if (competencias && !competencias.has(l.periodo.competencia)) continue;
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

function variacao(atual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return (atual - anterior) / anterior;
}

export function montarVisaoGeral(params: {
  condominio: { nome: string; codigo: string };
  recorte: RecorteId;
  totais: TotalOficial[];
  periodos: Periodo[];
  lancamentos: LancamentoComRel[];
  alertas: Alerta[];
}): VisaoGeralPayload {
  const { condominio, recorte, totais, periodos, lancamentos, alertas } = params;
  const oficial2026 = totais.find((t) => t.origem === "PLANILHA_2026");
  const oficial2025 = totais.find((t) => t.origem === "PLANILHA_2025");
  if (!oficial2026 || !oficial2025) {
    throw new Error("Totais oficiais 2025/2026 ausentes. Rode npm run importar.");
  }

  const janJul25 = new Set<string>(COMPETENCIAS_JAN_JUL_2025);
  const janJul26 = new Set<string>(COMPETENCIAS_JAN_JUL_2026);

  const rec25 = sumTipo(lancamentos, "RECEITA", janJul25);
  const des25 = sumTipo(lancamentos, "DESPESA", janJul25);
  const rec26eq = sumTipo(lancamentos, "RECEITA", janJul26);
  const des26eq = sumTipo(lancamentos, "DESPESA", janJul26);

  let receita = oficial2026.receitaCents;
  let despesa = oficial2026.despesaCents;
  let resultado = oficial2026.resultadoCents;
  let saldo = oficial2026.saldoFinalCents;
  let saldoInicial = SALDO_INICIAL_CENTS;
  let rotulo = oficial2026.rotulo;
  let inicio = oficial2026.periodoInicio;
  let fim = oficial2026.periodoFim;
  let qualidade = oficial2026.qualidade;
  let origemFiltro = "PLANILHA_2026";
  let competenciasFiltro: Set<string> | undefined;
  let variacaoReceita: number | null = null;
  let variacaoDespesa: number | null = null;
  let variacaoResultado: number | null = null;
  let variacaoSaldo: number | null = variacao(saldo, saldoInicial);
  let variacaoBaseSaldo = "saldo inicial do mesmo período";
  let variacaoBaseFluxo = "comparativo só no bloco Jan–Jul";

  if (recorte === "oficial-2025") {
    receita = oficial2025.receitaCents;
    despesa = oficial2025.despesaCents;
    resultado = oficial2025.resultadoCents;
    saldo = oficial2025.saldoFinalCents;
    rotulo = oficial2025.rotulo;
    inicio = oficial2025.periodoInicio;
    fim = oficial2025.periodoFim;
    qualidade = oficial2025.qualidade;
    origemFiltro = "PLANILHA_2025";
    variacaoSaldo = variacao(saldo, saldoInicial);
    variacaoReceita = null;
    variacaoDespesa = null;
    variacaoResultado = null;
    variacaoBaseFluxo = "sem comparativo equivalente neste recorte";
  } else if (recorte === "equivalente-jan-jul") {
    receita = rec26eq;
    despesa = des26eq;
    resultado = rec26eq - des26eq;
    const periodos26 = periodos.filter(
      (p) => p.origem === "PLANILHA_2026" && janJul26.has(p.competencia),
    );
    const ultimo = periodos26.find((p) => p.competencia === "2026-07");
    saldo = ultimo?.saldoFinalCents ?? resultado;
    rotulo = "Jan/2026 até Jul/2026";
    inicio = "2026-01";
    fim = "2026-07";
    qualidade = "COMPARAVEL";
    origemFiltro = "PLANILHA_2026";
    competenciasFiltro = janJul26;
    variacaoReceita = variacao(rec26eq, rec25);
    variacaoDespesa = variacao(des26eq, des25);
    variacaoResultado = variacao(resultado, rec25 - des25);
    variacaoSaldo = variacao(saldo, saldoInicial);
    variacaoBaseFluxo = "Jan–Jul/2025";
  }

  const periodosSerie = periodos
    .filter((p) => {
      if (recorte === "oficial-2025") return p.origem === "PLANILHA_2025";
      if (recorte === "equivalente-jan-jul") {
        return p.origem === "PLANILHA_2026" && janJul26.has(p.competencia);
      }
      return p.origem === "PLANILHA_2026";
    })
    .sort((a, b) => a.competencia.localeCompare(b.competencia));

  const serieMensal = periodosSerie.map((p) => {
    const rec = lancamentos
      .filter((l) => l.periodoId === p.id && l.tipo === "RECEITA")
      .reduce((a, l) => a + l.valorCents, 0);
    const des = lancamentos
      .filter((l) => l.periodoId === p.id && l.tipo === "DESPESA")
      .reduce((a, l) => a + l.valorCents, 0);
    return {
      competencia: p.competencia,
      receitaCents: rec,
      despesaCents: des,
      resultadoCents: rec - des,
      qualidade: p.qualidade,
      origemValor: p.qualidade === "RESIDUAL_MES_AUSENTE" ? "RESIDUAL_MES_AUSENTE" : "COLUNA_MES",
    };
  });

  const serieSaldo = periodosSerie.map((p) => ({
    competencia: p.competencia,
    saldoCents: p.saldoFinalCents ?? 0,
    qualidade: p.qualidade,
  }));

  const mesesCompletos = serieMensal.filter((m) => m.qualidade === "COMPLETO");
  const mediaDespesa =
    mesesCompletos.length === 0
      ? 0
      : Math.round(mesesCompletos.reduce((a, m) => a + m.despesaCents, 0) / mesesCompletos.length);
  const coberturaMeses = mediaDespesa === 0 ? null : saldo / mediaDespesa;
  const margem = receita === 0 ? null : resultado / receita;

  const qualidadeItens: VisaoGeralPayload["qualidade"] = [
    { codigo: "receitas", nivel: "ok", texto: "Receitas conciliadas com a coluna B da planilha." },
    { codigo: "despesas", nivel: "ok", texto: "Despesas conciliadas com a coluna B da planilha." },
    {
      codigo: "pagamento",
      nivel: "aviso",
      texto: "Status de pagamento não disponível. Rótulo usado: Despesa registrada.",
    },
  ];
  if (recorte === "oficial-2026") {
    qualidadeItens.push({
      codigo: "periodos-diferentes",
      nivel: "aviso",
      texto:
        "O recorte oficial 2026 tem 12 competências (Out/2025–Set/2026). O arquivo 2025 tem 7 meses. O comparativo da home usa só Jan–Jul.",
    });
    qualidadeItens.push({
      codigo: "set-incompleto",
      nivel: "aviso",
      texto: "Set/2026 está incompleto (REALIZADO parcial). Excluído da média de cobertura.",
    });
  }

  return {
    condominio,
    recorte,
    periodo: { rotulo, inicio, fim, selo: "REALIZADO", qualidade },
    kpis: {
      saldo: {
        id: "saldo",
        rotulo: "Saldo gerencial",
        valorCents: saldo,
        variacaoPct: variacaoSaldo,
        variacaoBase: variacaoBaseSaldo,
        extra:
          coberturaMeses === null
            ? undefined
            : `${coberturaMeses.toFixed(1)} meses de cobertura · margem ${margem === null ? "—" : `${(margem * 100).toFixed(1)}%`}`,
      },
      receitas: {
        id: "receitas",
        rotulo: "Receitas",
        valorCents: receita,
        variacaoPct: recorte === "oficial-2025" ? null : variacaoReceita,
        variacaoBase: recorte === "oficial-2025" ? "—" : variacaoBaseFluxo,
      },
      despesas: {
        id: "despesas",
        rotulo: "Despesas registradas",
        valorCents: despesa,
        variacaoPct: recorte === "oficial-2025" ? null : variacaoDespesa,
        variacaoBase: recorte === "oficial-2025" ? "—" : variacaoBaseFluxo,
      },
      resultado: {
        id: "resultado",
        rotulo: "Resultado",
        valorCents: resultado,
        variacaoPct: recorte === "equivalente-jan-jul" ? variacaoResultado : null,
        variacaoBase: recorte === "equivalente-jan-jul" ? "Jan–Jul/2025" : "ver bloco Jan–Jul abaixo",
      },
    },
    margem,
    coberturaMeses,
    saldoGerencialLabel: "Saldo gerencial do demonstrativo — não é saldo bancário segregado de fundo ou taxa extra.",
    serieSaldo,
    serieMensal,
    composicaoReceitas: composicao(
      lancamentos.filter((l) => l.origem === origemFiltro),
      "RECEITA",
      competenciasFiltro,
    ),
    composicaoDespesas: composicao(
      lancamentos.filter((l) => l.origem === origemFiltro),
      "DESPESA",
      competenciasFiltro,
    ),
    comparativoJanJul: {
      rotulo: "Jan–Jul/2025 vs Jan–Jul/2026",
      ano2025: { receitaCents: rec25, despesaCents: des25, resultadoCents: rec25 - des25 },
      ano2026: { receitaCents: rec26eq, despesaCents: des26eq, resultadoCents: rec26eq - des26eq },
    },
    alertas,
    qualidade: qualidadeItens,
    statusDespesa: "Despesa registrada",
    fonte: {
      arquivos: totais.map((t) => t.arquivo),
      atualizadoEm: new Date().toISOString(),
    },
  };
}
