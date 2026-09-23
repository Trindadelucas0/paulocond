import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import {
  centsParaReais,
  diaDaSemana,
  podeFinalizarChecklist,
  podeTransitar,
  reaisParaCents,
  statusFinal,
} from "../lib/operacao/regras";
import { linhaExportacao, pdfManutencoes, planilhaManutencoes, textoPlanilha } from "../lib/operacao/exportar";

test("manutenção só segue as transições permitidas", () => {
  assert.equal(podeTransitar("pendente", "em_andamento"), true);
  assert.equal(podeTransitar("pendente", "concluida"), false);
  assert.equal(podeTransitar("em_andamento", "concluida"), true);
  assert.equal(podeTransitar("concluida", "pendente"), false);
  assert.equal(podeTransitar("cancelada", "em_andamento"), false);
  assert.equal(statusFinal("concluida"), true);
  assert.equal(statusFinal("pendente"), false);
});

test("custo em centavos aceita vírgula e ponto", () => {
  assert.equal(reaisParaCents("10,50"), 1050);
  assert.equal(reaisParaCents("10.50"), 1050);
  assert.equal(reaisParaCents(""), null);
  assert.equal(centsParaReais(1050), "10,50");
  assert.throws(() => reaisParaCents("-1"));
});

test("checklist não fecha com item pendente ou sem justificativa", () => {
  assert.equal(
    podeFinalizarChecklist([{ status: "PENDING", comentario: null, exigeFoto: false, fotos: 0 }], true, false),
    "Marque todos os itens antes de finalizar.",
  );
  assert.equal(
    podeFinalizarChecklist([{ status: "NOT_DONE", comentario: "  ", exigeFoto: false, fotos: 0 }], true, false),
    "Item não feito precisa de justificativa.",
  );
  assert.equal(
    podeFinalizarChecklist([{ status: "DONE", comentario: null, exigeFoto: true, fotos: 0 }], false, false),
    "Este item exige foto.",
  );
  assert.equal(
    podeFinalizarChecklist([{ status: "DONE", comentario: null, exigeFoto: false, fotos: 0 }], true, false),
    null,
  );
});

test("dia da semana da data é estável", () => {
  assert.equal(diaDaSemana("2026-09-23"), 3);
  assert.equal(diaDaSemana("23/09/2026"), null);
});

test("exportação nomeia o responsável e bloqueia fórmula no Excel", async () => {
  const linha = linhaExportacao({
    titulo: "=cmd()",
    descricao: "Troca da lâmpada",
    tipo: "CORRETIVA",
    status: "pendente",
    prioridade: "NORMAL",
    local: "Bloco A",
    dataPrevista: new Date("2026-06-29T03:00:00.000Z"),
    custoCents: null,
    responsavelNome: "francisco",
    responsavel: null,
  });
  assert.equal(linha.responsavel, "francisco");
  assert.equal(linha.dataPrevista, "29/06/2026");
  assert.equal(textoPlanilha(linha.titulo), "'=cmd()");

  const xlsx = await planilhaManutencoes([linha], "Manutenções");
  assert.equal(xlsx.subarray(0, 2).toString(), "PK");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(xlsx);
  const sheet = wb.getWorksheet("Manutenções");
  assert.equal(sheet?.getRow(4).getCell(6).value, "francisco");

  const pdf = pdfManutencoes([linha], "Manutenções");
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.ok(pdf.toString("latin1").includes("6672616e636973636f"));
});
