import ExcelJS from "exceljs";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../lib/prisma";
import { nomeCanonico, slugify, naturezaDoGrupo, grupoCanonico } from "../lib/normalizar";
import { parseBrToCents, withinTolerance, sumCents } from "../lib/money";

const ROOT = process.cwd();
const ORIGINAIS = path.join(ROOT, "dados", "originais");

const TOTAIS_ESPERADOS: Record<
  string,
  { receita: number; despesa: number; resultado: number; saldoFinal: number; saldoInicial: number }
> = {
  PLANILHA_2026: {
    receita: 146_380_571,
    despesa: 131_777_836,
    resultado: 14_602_735,
    saldoFinal: 35_123_901,
    saldoInicial: 20_521_166,
  },
  PLANILHA_2025: {
    receita: 80_831_568,
    despesa: 78_409_981,
    resultado: 2_421_587,
    saldoFinal: 19_669_303,
    saldoInicial: 17_247_716,
  },
};

const ARQUIVOS = [
  {
    origem: "PLANILHA_2026" as const,
    arquivo: "015A - Demonstrativo de Receitas e Despesas 2026.xlsx",
    residualCompetencia: "2025-10",
    residualRotulo: "Out/2025",
  },
  {
    origem: "PLANILHA_2025" as const,
    arquivo: "015A - Demonstrativo de Receitas e Despesas 2025 COMPARATIVO.xlsx",
    residualCompetencia: "2025-01",
    residualRotulo: "Jan/2025",
  },
];

const MESES: Record<string, string> = {
  jan: "01",
  fev: "02",
  mar: "03",
  abr: "04",
  mai: "05",
  jun: "06",
  jul: "07",
  ago: "08",
  set: "09",
  out: "10",
  nov: "11",
  dez: "12",
};

type Tipo = "RECEITA" | "DESPESA";

type Detalhe = {
  linha: number;
  rotuloCru: string;
  nome: string;
  tipo: Tipo;
  grupoCru: string;
  totalCents: number;
  meses: { competencia: string; cents: number }[];
  residualCents: number;
};

function parseCompetencia(header: string): string | null {
  const m = header.trim().match(/^([A-Za-zÀ-ú]{3})\/(\d{4})$/i);
  if (!m) return null;
  const mes = MESES[m[1].normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()];
  if (!mes) return null;
  return `${m[2]}-${mes}`;
}

function isMetaRow(label: string): boolean {
  const n = label.trim();
  return n === "Saldo anterior" || n === "Saldo Final" || n.startsWith("Mov.");
}

function isTotalRow(label: string): boolean {
  return label.trim().startsWith("Total de");
}

function isSection(label: string): Tipo | null {
  const t = label.trim();
  if (/^-\s*R\s+E\s+C\s+E\s+I\s+T\s+A\s+S\s*$/i.test(t)) return "RECEITA";
  if (/^-\s*Despesas\s*$/i.test(t)) return "DESPESA";
  return null;
}

async function lerPlanilha(filePath: string) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const ws = wb.getWorksheet("pasta1") ?? wb.worksheets[0];
  if (!ws) throw new Error(`Sem aba em ${filePath}`);
  return ws;
}

function cellText(ws: ExcelJS.Worksheet, r: number, c: number): string {
  const v = ws.getCell(r, c).value;
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && "text" in v) return String((v as { text: string }).text);
  return String(v);
}

function cellCents(ws: ExcelJS.Worksheet, r: number, c: number): number | null {
  return parseBrToCents(ws.getCell(r, c).value);
}

type Parsed = {
  condominioLinha: string;
  rotuloPeriodo: string;
  colunasMes: { col: number; competencia: string; header: string }[];
  detalhes: Detalhe[];
  subtotalIssues: string[];
  saldoAnteriorPorCol: Record<number, number | null>;
  saldoFinalPorCol: Record<number, number | null>;
  movimentoPorCol: Record<number, number | null>;
  receitaOficial: number;
  despesaOficial: number;
  resultadoOficial: number;
  saldoInicialOficial: number;
  saldoFinalOficial: number;
};

function parseSheet(ws: ExcelJS.Worksheet, residualCompetencia: string): Parsed {
  const maxCol = Math.max(ws.columnCount || 0, 20);
  const maxRow = Math.max(ws.rowCount || 0, 200);
  const condominioLinha = cellText(ws, 1, 1);
  const rotuloPeriodo = cellText(ws, 4, 2) || cellText(ws, 3, 1);

  const colunasMes: { col: number; competencia: string; header: string }[] = [];
  for (let c = 3; c <= maxCol; c++) {
    const header = cellText(ws, 4, c).trim();
    if (!header) continue;
    if (/total do peri/i.test(header)) continue;
    const competencia = parseCompetencia(header);
    if (competencia) colunasMes.push({ col: c, competencia, header });
  }

  const saldoAnteriorPorCol: Record<number, number | null> = {};
  const saldoFinalPorCol: Record<number, number | null> = {};
  const movimentoPorCol: Record<number, number | null> = {};

  type Frame = { label: string; filhos: number[]; tipo: Tipo | null };
  const stack: Frame[] = [];
  const subtotalIssues: string[] = [];
  const detalhes: Detalhe[] = [];

  let tipoAtual: Tipo | null = null;
  let grupoAtual = "";

  let receitaOficial = 0;
  let despesaOficial = 0;
  let resultadoOficial = 0;
  let saldoInicialOficial = 0;
  let saldoFinalOficial = 0;

  for (let r = 1; r <= maxRow; r++) {
    const label = cellText(ws, r, 1).trim();
    if (!label) continue;
    const totalB = cellCents(ws, r, 2);

    if (label === "Saldo anterior") {
      for (let c = 2; c <= maxCol; c++) saldoAnteriorPorCol[c] = cellCents(ws, r, c);
      saldoInicialOficial = saldoAnteriorPorCol[2] ?? 0;
      continue;
    }
    if (label === "Saldo Final") {
      for (let c = 2; c <= maxCol; c++) saldoFinalPorCol[c] = cellCents(ws, r, c);
      saldoFinalOficial = saldoFinalPorCol[2] ?? 0;
      continue;
    }
    if (label.startsWith("Mov.")) {
      for (let c = 2; c <= maxCol; c++) movimentoPorCol[c] = cellCents(ws, r, c);
      resultadoOficial = movimentoPorCol[2] ?? 0;
      continue;
    }

    const section = isSection(label);
    if (section && totalB === null) {
      tipoAtual = section;
      grupoAtual = "";
      stack.push({ label, filhos: [], tipo: section });
      continue;
    }

    if (isTotalRow(label)) {
      const frame = stack.pop();
      const soma = frame ? sumCents(frame.filhos) : 0;
      if (totalB !== null && !withinTolerance(soma, totalB)) {
        subtotalIssues.push(
          `L${r} ${label}: planilha ${totalB} ≠ filhos ${soma} (diff ${soma - totalB})`,
        );
      }
      if (stack.length > 0 && totalB !== null) {
        stack[stack.length - 1].filhos.push(totalB);
      }
      if (label.includes("R E C E I T A S") && totalB !== null) receitaOficial = totalB;
      if (/Total de - Despesas$/i.test(label) && totalB !== null) despesaOficial = totalB;
      if (frame?.tipo === "DESPESA" && grupoAtual) {
        /* group closed */
      }
      continue;
    }

    if (totalB === null) {
      grupoAtual = nomeCanonico(label);
      stack.push({ label, filhos: [], tipo: tipoAtual });
      continue;
    }

    if (!tipoAtual) {
      throw new Error(`Linha ${r} com valor fora de seção: ${label}`);
    }

    const meses = colunasMes.map((col) => ({
      competencia: col.competencia,
      cents: cellCents(ws, r, col.col) ?? 0,
    }));
    const somaMeses = sumCents(meses.map((m) => m.cents));
    const residualCents = totalB - somaMeses;

    detalhes.push({
      linha: r,
      rotuloCru: label,
      nome: nomeCanonico(label),
      tipo: tipoAtual,
      grupoCru: grupoAtual || (tipoAtual === "RECEITA" ? "Receitas" : "Despesas"),
      totalCents: totalB,
      meses,
      residualCents,
    });

    if (stack.length > 0) stack[stack.length - 1].filhos.push(totalB);
  }

  return {
    condominioLinha,
    rotuloPeriodo,
    colunasMes,
    detalhes,
    subtotalIssues,
    saldoAnteriorPorCol,
    saldoFinalPorCol,
    movimentoPorCol,
    receitaOficial,
    despesaOficial,
    resultadoOficial,
    saldoInicialOficial,
    saldoFinalOficial,
  };
}

function qualidadeMes(competencia: string, receita: number, despesa: number, residual: boolean): string {
  if (residual) return "RESIDUAL_MES_AUSENTE";
  if (competencia === "2026-09") return "PARCIAL";
  if (receita === 0 && despesa === 0) return "PARCIAL";
  return "COMPLETO";
}

async function importarArquivo(
  condominioId: string,
  spec: (typeof ARQUIVOS)[number],
) {
  const filePath = path.join(ORIGINAIS, spec.arquivo);
  const ws = await lerPlanilha(filePath);
  const parsed = parseSheet(ws, spec.residualCompetencia);

  if (parsed.subtotalIssues.length > 0) {
    throw new Error(`Subtotais divergentes em ${spec.arquivo}:\n${parsed.subtotalIssues.join("\n")}`);
  }

  const esperado = TOTAIS_ESPERADOS[spec.origem];
  const checks: [string, number, number][] = [
    ["receita", parsed.receitaOficial, esperado.receita],
    ["despesa", parsed.despesaOficial, esperado.despesa],
    ["resultado", parsed.resultadoOficial, esperado.resultado],
    ["saldoInicial", parsed.saldoInicialOficial, esperado.saldoInicial],
    ["saldoFinal", parsed.saldoFinalOficial, esperado.saldoFinal],
  ];
  for (const [nome, obtido, exp] of checks) {
    if (!withinTolerance(obtido, exp)) {
      throw new Error(
        `${spec.origem} ${nome}: obtido ${obtido} ≠ esperado ${exp}. Importador incorreto — não ajuste KPI na tela.`,
      );
    }
  }

  const somaDetalheReceita = sumCents(parsed.detalhes.filter((d) => d.tipo === "RECEITA").map((d) => d.totalCents));
  const somaDetalheDespesa = sumCents(parsed.detalhes.filter((d) => d.tipo === "DESPESA").map((d) => d.totalCents));
  if (!withinTolerance(somaDetalheReceita, parsed.receitaOficial)) {
    throw new Error(`${spec.origem}: soma detalhes receita ${somaDetalheReceita} ≠ col B ${parsed.receitaOficial}`);
  }
  if (!withinTolerance(somaDetalheDespesa, parsed.despesaOficial)) {
    throw new Error(`${spec.origem}: soma detalhes despesa ${somaDetalheDespesa} ≠ col B ${parsed.despesaOficial}`);
  }

  const competencias = [
    spec.residualCompetencia,
    ...parsed.colunasMes.map((c) => c.competencia),
  ];
  const uniqueComp = [...new Set(competencias)];

  const receitaPorMes: Record<string, number> = {};
  const despesaPorMes: Record<string, number> = {};
  for (const comp of uniqueComp) {
    receitaPorMes[comp] = 0;
    despesaPorMes[comp] = 0;
  }
  for (const d of parsed.detalhes) {
    const bucket = d.tipo === "RECEITA" ? receitaPorMes : despesaPorMes;
    bucket[spec.residualCompetencia] += d.residualCents;
    for (const m of d.meses) bucket[m.competencia] += m.cents;
  }

  const periodoIds = new Map<string, string>();
  for (const competencia of uniqueComp) {
    const residual = competencia === spec.residualCompetencia;
    const colMes = parsed.colunasMes.find((c) => c.competencia === competencia);
    const saldoAnt = residual
      ? parsed.saldoAnteriorPorCol[2]
      : colMes
        ? parsed.saldoAnteriorPorCol[colMes.col]
        : null;
    const saldoFin = residual
      ? parsed.saldoAnteriorPorCol[parsed.colunasMes[0]?.col ?? 3]
      : colMes
        ? parsed.saldoFinalPorCol[colMes.col]
        : null;
    const mov = residual
      ? (receitaPorMes[competencia] ?? 0) - (despesaPorMes[competencia] ?? 0)
      : colMes
        ? parsed.movimentoPorCol[colMes.col]
        : null;

    const qualidade = qualidadeMes(
      competencia,
      receitaPorMes[competencia] ?? 0,
      despesaPorMes[competencia] ?? 0,
      residual,
    );

    const periodo = await prisma.periodo.create({
      data: {
        condominioId,
        competencia,
        origem: spec.origem,
        saldoAnteriorCents: saldoAnt,
        saldoFinalCents: saldoFin,
        movimentoLiquidoCents: mov,
        qualidade,
      },
    });
    periodoIds.set(`${competencia}|${spec.origem}`, periodo.id);
  }

  const dicionarioEntries: { nomeCru: string; origem: string; slug: string; nome: string; tipo: Tipo; grupo: string; natureza: string }[] = [];

  for (const d of parsed.detalhes) {
    const grupo = grupoCanonico(d.grupoCru, d.tipo);
    const natureza = naturezaDoGrupo(d.grupoCru, d.tipo);
    const slug = slugify(`${d.tipo}-${d.nome}`);
    dicionarioEntries.push({
      nomeCru: d.rotuloCru,
      origem: spec.origem,
      slug,
      nome: d.nome,
      tipo: d.tipo,
      grupo,
      natureza,
    });

    const categoria = await prisma.categoria.upsert({
      where: {
        condominioId_slug_tipo: { condominioId, slug, tipo: d.tipo },
      },
      create: {
        condominioId,
        slug,
        nome: d.nome,
        tipo: d.tipo,
        grupo,
        natureza,
      },
      update: { nome: d.nome, grupo, natureza },
    });

    await prisma.dicionarioCategoria.upsert({
      where: {
        condominioId_nomeCru_origem: {
          condominioId,
          nomeCru: d.rotuloCru,
          origem: spec.origem,
        },
      },
      create: {
        condominioId,
        nomeCru: d.rotuloCru,
        origem: spec.origem,
        categoriaId: categoria.id,
      },
      update: { categoriaId: categoria.id },
    });

    const periodoResidualId = periodoIds.get(`${spec.residualCompetencia}|${spec.origem}`);
    if (!periodoResidualId) throw new Error("Período residual ausente");

    await prisma.lancamento.create({
      data: {
        condominioId,
        periodoId: periodoResidualId,
        categoriaId: categoria.id,
        tipo: d.tipo,
        valorCents: d.residualCents,
        status: "REALIZADO",
        origem: spec.origem,
        origemValor: "RESIDUAL_MES_AUSENTE",
        linhaPlanilha: d.linha,
        arquivo: spec.arquivo,
        rotuloCru: d.rotuloCru,
      },
    });

    for (const m of d.meses) {
      const pid = periodoIds.get(`${m.competencia}|${spec.origem}`);
      if (!pid) throw new Error(`Período ${m.competencia} ausente`);
      await prisma.lancamento.create({
        data: {
          condominioId,
          periodoId: pid,
          categoriaId: categoria.id,
          tipo: d.tipo,
          valorCents: m.cents,
          status: "REALIZADO",
          origem: spec.origem,
          origemValor: "COLUNA_MES",
          linhaPlanilha: d.linha,
          arquivo: spec.arquivo,
          rotuloCru: d.rotuloCru,
        },
      });
    }
  }

  const avisos: string[] = [];
  if (spec.origem === "PLANILHA_2026") {
    avisos.push("Set/2026 está incompleto (REALIZADO parcial). Não usar esse mês em média/tendência sem aviso.");
    avisos.push("Out/2025 não tinha coluna mensal: reconstruído por residual (col B − soma Nov…Set).");
  } else {
    avisos.push("Jan/2025 não tinha coluna mensal: reconstruído por residual (col B − soma Fev…Jul).");
    avisos.push("Arquivo 2025 cobre Jan–Jul/2025 (7 meses), sem grupo Taxa Extra.");
  }

  const compsSorted = uniqueComp.slice().sort();
  await prisma.totalOficial.create({
    data: {
      condominioId,
      origem: spec.origem,
      arquivo: spec.arquivo,
      periodoInicio: compsSorted[0],
      periodoFim: compsSorted[compsSorted.length - 1],
      rotulo: parsed.rotuloPeriodo,
      receitaCents: parsed.receitaOficial,
      despesaCents: parsed.despesaOficial,
      resultadoCents: parsed.resultadoOficial,
      saldoInicialCents: parsed.saldoInicialOficial,
      saldoFinalCents: parsed.saldoFinalOficial,
      movimentoLiquidoCents: parsed.resultadoOficial,
      qualidade: spec.origem === "PLANILHA_2026" ? "PARCIAL" : "COMPLETO",
      avisosJson: JSON.stringify(avisos),
    },
  });

  return { parsed, dicionarioEntries, avisos };
}

async function main() {
  const condominio = await prisma.condominio.upsert({
    where: { codigo: "132" },
    create: { nome: "Canto do Sabiá", codigo: "132" },
    update: { nome: "Canto do Sabiá" },
  });

  await prisma.lancamento.deleteMany({ where: { condominioId: condominio.id } });
  await prisma.dicionarioCategoria.deleteMany({ where: { condominioId: condominio.id } });
  await prisma.categoria.deleteMany({ where: { condominioId: condominio.id } });
  await prisma.periodo.deleteMany({ where: { condominioId: condominio.id } });
  await prisma.totalOficial.deleteMany({ where: { condominioId: condominio.id } });

  const dicionario: unknown[] = [];
  for (const spec of ARQUIVOS) {
    const { parsed, dicionarioEntries, avisos } = await importarArquivo(condominio.id, spec);
    console.log(
      `${spec.origem}: ${parsed.detalhes.length} categorias, ${parsed.colunasMes.length} meses + residual ${spec.residualCompetencia}`,
    );
    for (const a of avisos) console.log(`  aviso: ${a}`);
    dicionario.push(
      ...dicionarioEntries.map((e) => ({
        nomeCru: e.nomeCru,
        origem: e.origem,
        nomeCanonico: e.nome,
        slug: e.slug,
        tipo: e.tipo,
        grupo: e.grupo,
        natureza: e.natureza,
      })),
    );
  }

  mkdirSync(path.join(ROOT, "dados"), { recursive: true });
  writeFileSync(
    path.join(ROOT, "dados", "dicionario.json"),
    JSON.stringify({ geradoEm: new Date().toISOString(), entradas: dicionario }, null, 2),
    "utf8",
  );

  console.log("Importação concluída. Totais oficiais conferidos com a coluna B.");
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
