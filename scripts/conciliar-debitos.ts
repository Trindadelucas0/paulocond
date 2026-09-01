/**
 * Conciliação: débitos detalhe (extrato fiscal multiempresa) × dashboard Canto do Sabiá.
 * Somente leitura — não grava no banco.
 *
 * Uso: npx tsx scripts/conciliar-debitos.ts
 */

import ExcelJS from "exceljs";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../lib/prisma";
import { parseBrToCents, sumCents, withinTolerance, centsToNumber } from "../lib/money";

const ARQUIVOS_DEBITO = [
  "d:/Downloads migrado/debitos_detalhe_2026-09-01.xlsx",
  "d:/Downloads migrado/debitos_detalhe_2026-09-01 - Copia.xlsx",
];

const CODIGO_CONDOMINIO = "132";
const NOME_CONDOMINIO = "Canto do Sabiá";

type LinhaFiscal = {
  arquivo: string;
  linha: number;
  competenciaExtrato: string;
  codigoEmpresa: string;
  empresa: string;
  cnpj: string;
  esfera: string;
  periodoApuracao: string;
  receitaCodigo: string;
  situacao: string;
  titulo: string;
  vencimento: string;
  valorOriginalCents: number;
  saldoDevedorCents: number;
  multaCents: number;
  jurosCents: number;
  consolidadoCents: number;
  origem: string;
  arquivoPdf: string;
};

function cellText(ws: ExcelJS.Worksheet, r: number, c: number): string {
  const v = ws.getCell(r, c).value;
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && "text" in v) return String((v as { text: string }).text).trim();
  if (typeof v === "object" && "result" in v) return String((v as { result: unknown }).result ?? "").trim();
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

function cellCents(ws: ExcelJS.Worksheet, r: number, c: number): number {
  return parseBrToCents(ws.getCell(r, c).value) ?? 0;
}

function parseCompetenciaExtrato(raw: string): string | null {
  const t = raw.trim();
  const mmYyyy = t.match(/^(\d{2})-(\d{4})$/);
  if (mmYyyy) return `${mmYyyy[2]}-${mmYyyy[1]}`;
  return null;
}

function fingerprint(l: LinhaFiscal): string {
  return [
    l.codigoEmpresa, l.cnpj, l.receitaCodigo, l.periodoApuracao,
    l.situacao, l.valorOriginalCents, l.consolidadoCents, l.arquivoPdf,
  ].join("|");
}

function brl(cents: number): string {
  return centsToNumber(cents).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function parseArquivoFiscal(filePath: string): Promise<{ linhas: LinhaFiscal[]; aba: string }> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error(`Sem aba em ${filePath}`);

  const linhas: LinhaFiscal[] = [];
  const arquivo = path.basename(filePath);
  const maxRow = ws.rowCount || 0;

  for (let r = 2; r <= maxRow; r++) {
    const competenciaExtrato = cellText(ws, r, 1);
    const codigoEmpresa = cellText(ws, r, 2);
    const empresa = cellText(ws, r, 3);
    if (!codigoEmpresa && !empresa) continue;

    const consolidadoCents = cellCents(ws, r, 17);
    const valorOriginalCents = cellCents(ws, r, 13);
    if (consolidadoCents === 0 && valorOriginalCents === 0) continue;

    linhas.push({
      arquivo,
      linha: r,
      competenciaExtrato,
      codigoEmpresa,
      empresa,
      cnpj: cellText(ws, r, 4),
      esfera: cellText(ws, r, 5),
      periodoApuracao: cellText(ws, r, 6),
      receitaCodigo: cellText(ws, r, 7),
      situacao: cellText(ws, r, 8),
      titulo: cellText(ws, r, 9),
      vencimento: cellText(ws, r, 12),
      valorOriginalCents,
      saldoDevedorCents: cellCents(ws, r, 14),
      multaCents: cellCents(ws, r, 15),
      jurosCents: cellCents(ws, r, 16),
      consolidadoCents,
      origem: cellText(ws, r, 18),
      arquivoPdf: cellText(ws, r, 19),
    });
  }

  return { linhas, aba: ws.name };
}

async function dadosDashboard(condominioId: string) {
  const categoriasImpostos = await prisma.categoria.findMany({
    where: { condominioId, grupo: "Impostos", tipo: "DESPESA" },
  });
  const catIds = categoriasImpostos.map((c) => c.id);

  const lancamentosImpostos = await prisma.lancamento.findMany({
    where: {
      condominioId,
      origem: "PLANILHA_2026",
      tipo: "DESPESA",
      categoriaId: { in: catIds },
    },
    include: { categoria: true, periodo: true },
  });

  const oficial = await prisma.totalOficial.findFirst({
    where: { condominioId, origem: "PLANILHA_2026" },
  });

  const porCategoria = new Map<string, number>();
  for (const l of lancamentosImpostos) {
    porCategoria.set(l.categoria.nome, (porCategoria.get(l.categoria.nome) ?? 0) + l.valorCents);
  }

  const cotas = await prisma.lancamento.aggregate({
    where: {
      condominioId,
      origem: "PLANILHA_2026",
      tipo: "RECEITA",
      categoria: { nome: "Cotas de Condomínio" },
    },
    _sum: { valorCents: true },
  });

  return {
    oficial,
    impostosTotal: sumCents(lancamentosImpostos.map((l) => l.valorCents)),
    impostosPorCategoria: Object.fromEntries(porCategoria),
    cotasTotal: cotas._sum.valorCents ?? 0,
  };
}

async function main() {
  const parsedFiles = await Promise.all(ARQUIVOS_DEBITO.map(parseArquivoFiscal));
  const [a, b] = parsedFiles;

  const fpsA = new Set(a.linhas.map(fingerprint));
  const fpsB = new Set(b.linhas.map(fingerprint));
  const soEmA = a.linhas.filter((l) => !fpsB.has(fingerprint(l)));
  const soEmB = b.linhas.filter((l) => !fpsA.has(fingerprint(l)));
  const arquivosIguais = soEmA.length === 0 && soEmB.length === 0 && a.linhas.length === b.linhas.length;

  const linhas = a.linhas;

  const totaisExtrato = {
    linhas: linhas.length,
    valorOriginal: sumCents(linhas.map((l) => l.valorOriginalCents)),
    saldoDevedor: sumCents(linhas.map((l) => l.saldoDevedorCents)),
    multa: sumCents(linhas.map((l) => l.multaCents)),
    juros: sumCents(linhas.map((l) => l.jurosCents)),
    consolidado: sumCents(linhas.map((l) => l.consolidadoCents)),
    devedor: sumCents(linhas.filter((l) => l.situacao === "DEVEDOR").map((l) => l.consolidadoCents)),
    aVencer: sumCents(linhas.filter((l) => /VENCER/i.test(l.situacao)).map((l) => l.consolidadoCents)),
  };

  const empresasUnicas = new Map<string, { nome: string; linhas: number; consolidado: number }>();
  for (const l of linhas) {
    const key = l.codigoEmpresa;
    if (!empresasUnicas.has(key)) {
      empresasUnicas.set(key, { nome: l.empresa, linhas: 0, consolidado: 0 });
    }
    const e = empresasUnicas.get(key)!;
    e.linhas++;
    e.consolidado += l.consolidadoCents;
  }

  const condominioRefs = linhas.filter((l) =>
    /canto|sabi[aá]|condom[ií]nio\s+residencial/i.test(l.empresa),
  );

  const codigo132Extrato = linhas.filter((l) => l.codigoEmpresa === CODIGO_CONDOMINIO);
  const codigo132Empresa = codigo132Extrato[0]?.empresa ?? null;

  const porEsfera = new Map<string, number>();
  for (const l of linhas) {
    porEsfera.set(l.esfera, (porEsfera.get(l.esfera) ?? 0) + l.consolidadoCents);
  }

  const porSituacao = new Map<string, number>();
  for (const l of linhas) {
    porSituacao.set(l.situacao, (porSituacao.get(l.situacao) ?? 0) + 1);
  }

  const condominio = await prisma.condominio.findFirst({ where: { codigo: CODIGO_CONDOMINIO } });
  if (!condominio) throw new Error("Condomínio 132 ausente — rode npm run importar");

  const dash = await dadosDashboard(condominio.id);

  const topEmpresas = [...empresasUnicas.entries()]
    .map(([codigo, d]) => ({ codigo, ...d }))
    .sort((x, y) => y.consolidado - x.consolidado)
    .slice(0, 10);

  const divergencias: { tipo: string; descricao: string; extrato?: string; dashboard?: string }[] = [];

  if (condominioRefs.length === 0) {
    divergencias.push({
      tipo: "FONTE_INCOMPATIVEL",
      descricao: `Nenhuma linha do extrato menciona "${NOME_CONDOMINIO}" ou condomínio. O arquivo é de débitos fiscais de ${empresasUnicas.size} empresas clientes de escritório contábil — não de unidades do condomínio.`,
    });
  }

  if (codigo132Extrato.length > 0 && codigo132Empresa && !/canto|sabi[aá]/i.test(codigo132Empresa)) {
    divergencias.push({
      tipo: "CODIGO_HOMONIMO",
      descricao: `O código "${CODIGO_CONDOMINIO}" no extrato pertence a "${codigo132Empresa}" (${codigo132Extrato.length} linhas, ${brl(sumCents(codigo132Extrato.map((l) => l.consolidadoCents)))}). No dashboard, 132 é o código do condomínio ${NOME_CONDOMINIO}. São cadastros diferentes.`,
      extrato: codigo132Empresa,
      dashboard: NOME_CONDOMINIO,
    });
  }

  const diffImpostos = totaisExtrato.consolidado - dash.impostosTotal;
  divergencias.push({
    tipo: "TOTAL_IMPOSTOS_INCOMPARAVEL",
    descricao: `Extrato consolidado (${brl(totaisExtrato.consolidado)}, ${empresasUnicas.size} empresas) ≠ Impostos do demonstrativo (${brl(dash.impostosTotal)}, só ${NOME_CONDOMINIO}). Conceitos diferentes: saldo devedor fiscal multiempresa vs despesa registrada do condomínio.`,
    extrato: brl(totaisExtrato.consolidado),
    dashboard: brl(dash.impostosTotal),
  });

  if (!withinTolerance(totaisExtrato.consolidado, dash.oficial?.despesaCents ?? 0)) {
    divergencias.push({
      tipo: "TOTAL_GERAL_INCOMPARAVEL",
      descricao: `Extrato consolidado (${brl(totaisExtrato.consolidado)}) ≠ Despesa oficial do dashboard (${brl(dash.oficial?.despesaCents ?? 0)}). Esperado: são bases distintas.`,
      extrato: brl(totaisExtrato.consolidado),
      dashboard: brl(dash.oficial?.despesaCents ?? 0),
    });
  }

  let conclusao: string;
  if (!arquivosIguais) {
    conclusao = `Os dois Excel divergem (${soEmA.length} linhas só no original, ${soEmB.length} na Cópia).`;
  } else if (condominioRefs.length === 0) {
    conclusao =
      `Os arquivos debitos_detalhe NÃO são do condomínio ${NOME_CONDOMINIO}. São extrato fiscal de ${empresasUnicas.size} empresas (competência do extrato: 07/2026). Os números não batem com o dashboard porque a fonte é outra — não é bug de importação do 015A.`;
  } else {
    conclusao = "Há referência ao condomínio no extrato; revisar linhas filtradas.";
  }

  const relatorio = {
    geradoEm: new Date().toISOString(),
    tipoExtrato: "debitos_fiscais_multiempresa",
    competenciaExtrato: "2026-07",
  arquivos: parsedFiles.map((p, i) => ({
      path: ARQUIVOS_DEBITO[i],
      aba: p.aba,
      linhas: p.linhas.length,
    })),
    diffArquivos: { iguais: arquivosIguais, soNoOriginal: soEmA.length, soNaCopia: soEmB.length },
    totaisExtrato,
    totaisExtratoBrl: {
      valorOriginal: brl(totaisExtrato.valorOriginal),
      consolidado: brl(totaisExtrato.consolidado),
      devedor: brl(totaisExtrato.devedor),
      aVencer: brl(totaisExtrato.aVencer),
    },
    empresasNoExtrato: empresasUnicas.size,
    topEmpresas: topEmpresas.map((e) => ({
      ...e,
      consolidadoBrl: brl(e.consolidado),
    })),
    porEsfera: Object.fromEntries([...porEsfera.entries()].map(([k, v]) => [k, { cents: v, brl: brl(v) }])),
    porSituacao: Object.fromEntries(porSituacao),
    condominioNoExtrato: condominioRefs.length,
    codigo132NoExtrato: {
      empresa: codigo132Empresa,
      linhas: codigo132Extrato.length,
      consolidado: sumCents(codigo132Extrato.map((l) => l.consolidadoCents)),
      consolidadoBrl: brl(sumCents(codigo132Extrato.map((l) => l.consolidadoCents))),
      amostra: codigo132Extrato.slice(0, 5).map((l) => ({
        receita: l.receitaCodigo,
        situacao: l.situacao,
        consolidadoBrl: brl(l.consolidadoCents),
      })),
    },
    dashboard: {
      condominio: { nome: condominio.nome, codigo: condominio.codigo },
      oficial: dash.oficial
        ? {
            receitaCents: dash.oficial.receitaCents,
            despesaCents: dash.oficial.despesaCents,
            saldoFinalCents: dash.oficial.saldoFinalCents,
            receitaBrl: brl(dash.oficial.receitaCents),
            despesaBrl: brl(dash.oficial.despesaCents),
            saldoFinalBrl: brl(dash.oficial.saldoFinalCents),
          }
        : null,
      impostosTotalCents: dash.impostosTotal,
      impostosTotalBrl: brl(dash.impostosTotal),
      impostosPorCategoria: Object.fromEntries(
        Object.entries(dash.impostosPorCategoria).map(([k, v]) => [k, { cents: v, brl: brl(v) }]),
      ),
      cotasTotalBrl: brl(dash.cotasTotal),
    },
    divergencias,
    conclusao,
  };

  const outDir = path.join(process.cwd(), "dados");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "conciliacao-debitos.json");
  writeFileSync(outPath, JSON.stringify(relatorio, null, 2), "utf8");

  console.log("\n=== CONCILIAÇÃO DÉBITOS × DASHBOARD ===\n");
  console.log("Tipo do extrato: débitos fiscais multiempresa (NÃO é inadimplência de unidades)");
  console.log("Arquivos iguais?", arquivosIguais ? "SIM" : `NÃO (${soEmA.length}/${soEmB.length})`);
  console.log(`\nExtrato: ${totaisExtrato.linhas} linhas | ${empresasUnicas.size} empresas`);
  console.log(`Consolidado: ${brl(totaisExtrato.consolidado)} | Devedor: ${brl(totaisExtrato.devedor)}`);
  console.log(`\nDashboard ${NOME_CONDOMINIO} (cód. ${CODIGO_CONDOMINIO}):`);
  if (dash.oficial) {
    console.log(`  Receita:  ${brl(dash.oficial.receitaCents)}`);
    console.log(`  Despesa:  ${brl(dash.oficial.despesaCents)}`);
    console.log(`  Impostos: ${brl(dash.impostosTotal)}`);
    console.log(`  Cotas:    ${brl(dash.cotasTotal)}`);
  }
  console.log(`\nCódigo 132 no extrato → "${codigo132Empresa}" (${codigo132Extrato.length} linhas)`);
  console.log(`Referências a "${NOME_CONDOMINIO}" no extrato: ${condominioRefs.length}`);
  console.log("\n--- Divergências ---");
  for (const d of divergencias) {
    console.log(`[${d.tipo}] ${d.descricao}`);
  }
  console.log(`\nConclusão: ${conclusao}`);
  console.log(`\nJSON: ${outPath}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
