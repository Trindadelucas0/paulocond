import ExcelJS from "exceljs";
import { centsParaReais } from "@/lib/operacao/regras";

export type LinhaExportacao = {
  titulo: string;
  descricao: string;
  tipo: string;
  status: string;
  prioridade: string;
  responsavel: string;
  local: string;
  dataPrevista: string;
  custo: string;
};

type Origem = {
  titulo: string;
  descricao: string;
  tipo: string;
  status: string;
  prioridade: string;
  local: string | null;
  dataPrevista: Date | string | null;
  custoCents: number | null;
  responsavelNome: string | null;
  responsavel: { nome: string } | null;
};

function rotuloStatus(status: string) {
  if (status === "em_andamento") return "Em andamento";
  if (status === "concluida") return "Concluída";
  if (status === "cancelada") return "Cancelada";
  return "Pendente";
}

function rotuloTipo(tipo: string) {
  return tipo === "PREVENTIVA" ? "Preventiva" : "Corretiva";
}

function rotuloPrioridade(prioridade: string) {
  if (prioridade === "BAIXA") return "Baixa";
  if (prioridade === "ALTA") return "Alta";
  if (prioridade === "URGENTE") return "Urgente";
  return "Normal";
}

function dataCurta(valor: Date | string | null) {
  if (!valor) return "";
  const iso = valor instanceof Date ? valor.toISOString() : valor;
  const dia = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return "";
  const [ano, mes, d] = dia.split("-");
  return `${d}/${mes}/${ano}`;
}

export function textoPlanilha(valor: string) {
  const limpo = valor.replace(/\r?\n/g, " ").trim();
  if (/^[=+\-@]/.test(limpo)) return `'${limpo}`;
  return limpo;
}

export function linhaExportacao(item: Origem): LinhaExportacao {
  return {
    titulo: item.titulo,
    descricao: item.descricao,
    tipo: rotuloTipo(item.tipo),
    status: rotuloStatus(item.status),
    prioridade: rotuloPrioridade(item.prioridade),
    responsavel: item.responsavel?.nome || item.responsavelNome || "Sem responsável",
    local: item.local || "",
    dataPrevista: dataCurta(item.dataPrevista),
    custo: item.custoCents != null ? centsParaReais(item.custoCents) : "",
  };
}

export async function planilhaManutencoes(linhas: LinhaExportacao[], titulo: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Canto do Sabiá";
  const sheet = wb.addWorksheet("Manutenções");
  sheet.addRow([titulo]);
  sheet.addRow([]);
  sheet.addRow([
    "Título",
    "Descrição",
    "Tipo",
    "Status",
    "Prioridade",
    "Responsável",
    "Local",
    "Data prevista",
    "Custo (R$)",
  ]);
  const cabecalho = sheet.getRow(3);
  cabecalho.font = { bold: true };
  for (const linha of linhas) {
    sheet.addRow([
      textoPlanilha(linha.titulo),
      textoPlanilha(linha.descricao),
      linha.tipo,
      linha.status,
      linha.prioridade,
      textoPlanilha(linha.responsavel),
      textoPlanilha(linha.local),
      linha.dataPrevista,
      linha.custo,
    ]);
  }
  sheet.columns = [
    { width: 42 },
    { width: 56 },
    { width: 14 },
    { width: 16 },
    { width: 14 },
    { width: 28 },
    { width: 24 },
    { width: 16 },
    { width: 14 },
  ];
  sheet.views = [{ state: "frozen", ySplit: 3 }];
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function pdfHex(valor: string) {
  let hex = "";
  for (const ch of valor) {
    const code = ch.codePointAt(0) ?? 63;
    const byte = code >= 32 && code <= 255 ? code : 63;
    hex += byte.toString(16).padStart(2, "0");
  }
  return `<${hex}>`;
}

function cortar(valor: string, max: number) {
  const limpo = valor.replace(/\s+/g, " ").trim();
  if (limpo.length <= max) return limpo;
  return `${limpo.slice(0, max - 3)}...`;
}

function montarPdf(streams: string[]) {
  const partes: Buffer[] = [Buffer.from("%PDF-1.4\n", "latin1")];
  const offsets = [0];
  let cursor = partes[0].length;

  function add(obj: string) {
    offsets.push(cursor);
    const buf = Buffer.from(obj, "latin1");
    partes.push(buf);
    cursor += buf.length;
  }

  const kids = streams.map((_, i) => `${4 + i * 2} 0 R`).join(" ");
  add("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  add(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${streams.length} >>\nendobj\n`);
  add("3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n");

  streams.forEach((stream, i) => {
    const pageId = 4 + i * 2;
    const contentId = pageId + 1;
    add(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R >> >> >>\nendobj\n`,
    );
    const body = Buffer.from(stream, "latin1");
    const header = Buffer.from(`${contentId} 0 obj\n<< /Length ${body.length} >>\nstream\n`, "latin1");
    const footer = Buffer.from("\nendstream\nendobj\n", "latin1");
    offsets.push(cursor);
    partes.push(header, body, footer);
    cursor += header.length + body.length + footer.length;
  });

  let xref = `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${cursor}\n%%EOF\n`;
  partes.push(Buffer.from(xref, "latin1"));
  return Buffer.concat(partes);
}

function texto(x: number, y: number, tamanho: number, valor: string) {
  return `BT /F1 ${tamanho} Tf 1 0 0 1 ${x} ${y} Tm ${pdfHex(valor)} Tj ET\n`;
}

export function pdfManutencoes(linhas: LinhaExportacao[], titulo: string) {
  const colunas = [
    { x: 40, rotulo: "Título", max: 46, campo: "titulo" as const },
    { x: 300, rotulo: "Tipo", max: 12, campo: "tipo" as const },
    { x: 370, rotulo: "Status", max: 14, campo: "status" as const },
    { x: 460, rotulo: "Responsável", max: 24, campo: "responsavel" as const },
    { x: 640, rotulo: "Data", max: 12, campo: "dataPrevista" as const },
  ];
  const porPagina = 24;
  const grupos = linhas.length ? Array.from({ length: Math.ceil(linhas.length / porPagina) }, (_, i) => linhas.slice(i * porPagina, (i + 1) * porPagina)) : [[]];
  const streams = grupos.map((grupo, pagina) => {
    let out = "0.094 0.353 0.286 rg\n36 548 770 32 re f\n";
    out += "1 1 1 rg\n";
    out += texto(44, 560, 12, cortar(titulo, 70));
    out += texto(700, 560, 9, `${pagina + 1}/${grupos.length}`);
    out += "0.09 0.09 0.11 rg\n";
    out += texto(40, 528, 8, `${linhas.length} registro(s)`);
    for (const coluna of colunas) out += texto(coluna.x, 508, 8, coluna.rotulo);
    out += "0.7 0.72 0.75 RG\n40 502 m 790 502 l S\n";
    grupo.forEach((linha, indice) => {
      const y = 484 - indice * 18;
      if (indice % 2 === 0) {
        out += "0.96 0.97 0.98 rg\n36 " + (y - 4) + " 770 16 re f\n0.09 0.09 0.11 rg\n";
      }
      for (const coluna of colunas) {
        out += texto(coluna.x, y, 8, cortar(linha[coluna.campo], coluna.max));
      }
    });
    if (!linhas.length) out += texto(40, 470, 10, "Nenhuma manutenção neste filtro.");
    return out;
  });
  return montarPdf(streams);
}
