import type { Alerta, LancamentoComRel } from "@/lib/kpis";
import { COMPETENCIAS_JAN_JUL_2025, COMPETENCIAS_JAN_JUL_2026, formatPct, mesLabel } from "@/lib/format";

function somaCategoria(
  lancamentos: LancamentoComRel[],
  nome: string,
  competencias: Set<string>,
) {
  return lancamentos
    .filter(
      (l) =>
        l.categoria.nome === nome && competencias.has(l.periodo.competencia),
    )
    .reduce((a, l) => a + l.valorCents, 0);
}

function somaGrupo(
  lancamentos: LancamentoComRel[],
  grupo: string,
  tipo: "RECEITA" | "DESPESA",
  competencias?: Set<string>,
) {
  return lancamentos
    .filter(
      (l) =>
        l.tipo === tipo &&
        l.categoria.grupo === grupo &&
        (!competencias || competencias.has(l.periodo.competencia)),
    )
    .reduce((a, l) => a + l.valorCents, 0);
}

export function montarAlertas(lancamentos: LancamentoComRel[]): Alerta[] {
  const alertas: Alerta[] = [];
  const janJul25 = new Set<string>(COMPETENCIAS_JAN_JUL_2025);
  const janJul26 = new Set<string>(COMPETENCIAS_JAN_JUL_2026);

  const set = lancamentos.filter((l) => l.periodo.competencia === "2026-09");
  const recSet = set.filter((l) => l.tipo === "RECEITA").reduce((a, l) => a + l.valorCents, 0);
  const desSet = set.filter((l) => l.tipo === "DESPESA").reduce((a, l) => a + l.valorCents, 0);
  if (desSet === 0 && recSet > 0 && recSet < 500_000) {
    alertas.push({
      id: "set-2026-parcial",
      nivel: "aviso",
      texto: `Set/2026 está incompleto: receita ${formatBRLSafe(recSet)} e despesa ${formatBRLSafe(desSet)} (REALIZADO parcial).`,
    });
  }

  const porMes = new Map<string, { rec: number; des: number; qualidade: string }>();
  for (const l of lancamentos.filter((x) => x.origem === "PLANILHA_2026")) {
    const key = l.periodo.competencia;
    const cur = porMes.get(key) ?? { rec: 0, des: 0, qualidade: l.periodo.qualidade };
    if (l.tipo === "RECEITA") cur.rec += l.valorCents;
    else cur.des += l.valorCents;
    porMes.set(key, cur);
  }
  const mesesCheios = [...porMes.entries()].filter(
    ([comp, v]) => v.qualidade === "COMPLETO" && comp !== "2026-08" && comp !== "2026-09",
  );
  const medianaDespesa = mediana(mesesCheios.map(([, v]) => v.des));
  const ago = porMes.get("2026-08");
  if (ago && medianaDespesa > 0 && ago.des < medianaDespesa * 0.55) {
    alertas.push({
      id: "ago-2026-atipico",
      nivel: "aviso",
      texto: `Ago/2026 tem despesa ${formatBRLSafe(ago.des)} frente à mediana ${formatBRLSafe(medianaDespesa)} dos meses cheios — possível atraso de lançamento.`,
    });
  }

  const despesa2026 = lancamentos
    .filter((l) => l.origem === "PLANILHA_2026" && l.tipo === "DESPESA")
    .reduce((a, l) => a + l.valorCents, 0);
  const terceirizada = lancamentos
    .filter(
      (l) =>
        l.origem === "PLANILHA_2026" &&
        l.tipo === "DESPESA" &&
        l.categoria.nome === "Empresa Terceirizada",
    )
    .reduce((a, l) => a + l.valorCents, 0);
  if (despesa2026 > 0 && terceirizada / despesa2026 >= 0.35) {
    alertas.push({
      id: "concentracao-terceirizada",
      nivel: "atencao",
      texto: `Empresa terceirizada representa ${formatPct(terceirizada / despesa2026)} das despesas registradas do período oficial 2026.`,
    });
  }

  const manut25 = somaGrupo(lancamentos, "Manutenção", "DESPESA", janJul25);
  const manut26 = somaGrupo(lancamentos, "Manutenção", "DESPESA", janJul26);
  if (manut25 > 0) {
    const varManut = (manut26 - manut25) / manut25;
    if (Math.abs(varManut) >= 0.5) {
      alertas.push({
        id: "manutencao-jan-jul",
        nivel: "atencao",
        texto: `Manutenção em Jan–Jul/2026 ${formatPct(varManut)} vs Jan–Jul/2025 (${formatBRLSafe(manut25)} → ${formatBRLSafe(manut26)}).`,
      });
    }
  }

  const tercNome = "Empresa Terceirizada";
  const t25 = somaCategoria(lancamentos, tercNome, janJul25);
  const t26 = somaCategoria(lancamentos, tercNome, janJul26);
  if (t25 > 0) {
    const v = (t26 - t25) / t25;
    if (Math.abs(v) >= 0.15) {
      alertas.push({
        id: "terceirizada-jan-jul",
        nivel: "aviso",
        texto: `${tercNome} em Jan–Jul/2026 ${formatPct(v)} vs Jan–Jul/2025.`,
      });
    }
  }

  for (const [comp, v] of porMes) {
    if (v.qualidade === "COMPLETO" && v.des > v.rec) {
      alertas.push({
        id: `resultado-negativo-${comp}`,
        nivel: "aviso",
        texto: `${mesLabel(comp)} teve resultado negativo (${formatBRLSafe(v.rec - v.des)}).`,
      });
    }
  }

  return alertas.slice(0, 8);
}

function mediana(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? Math.round((s[mid - 1] + s[mid]) / 2) : s[mid];
}

function formatBRLSafe(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}
