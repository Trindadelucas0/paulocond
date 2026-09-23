import fs from "fs";
import path from "path";
import { prisma } from "../lib/prisma";
import { condominioDoCodigo } from "../lib/tenant";

type UsuarioOrigem = { id: number; email: string; full_name: string };
type ManutencaoOrigem = {
  id: number;
  maintenance_type: string;
  title: string;
  description: string;
  location: string | null;
  priority: string | null;
  scheduled_date: string | null;
  assigned_to: number | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  completed_by: number | null;
  completion_notes: string | null;
  cost: string | number | null;
  created_by: number | null;
  idempotency_key: string | null;
  created_at: string | null;
};

type Pacote = {
  condominio?: { id: number; name: string };
  usuarios?: UsuarioOrigem[];
  manutencoes?: ManutencaoOrigem[];
};

function custoCents(valor: string | number | null) {
  if (valor === null || valor === undefined || valor === "") return null;
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return null;
  return Math.round(numero * 100);
}

function dataOuNull(valor: string | null) {
  if (!valor) return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

async function main() {
  const arquivo = process.argv.find((item) => item.endsWith(".json"));
  if (!arquivo) {
    console.error("Informe o JSON: npm run importar:operacao -- caminho/operacao-dados.json");
    process.exit(1);
  }
  const pacote = JSON.parse(fs.readFileSync(path.resolve(arquivo), "utf8")) as Pacote;
  const condominio = await condominioDoCodigo();

  const porEmail = new Map(
    (
      await prisma.usuario.findMany({
        where: { condominioId: condominio.id },
        select: { id: true, email: true },
      })
    ).map((usuario) => [usuario.email.toLowerCase(), usuario.id]),
  );
  const origemParaEmail = new Map((pacote.usuarios || []).map((usuario) => [usuario.id, usuario.email.toLowerCase()]));
  const origemParaNome = new Map(
    (pacote.usuarios || []).map((usuario) => [usuario.id, String(usuario.full_name || "").trim()]),
  );
  const semPar = new Set<string>();

  function destino(idOrigem: number | null) {
    if (!idOrigem) return null;
    const email = origemParaEmail.get(idOrigem);
    if (!email) return null;
    const id = porEmail.get(email);
    if (!id) {
      semPar.add(email);
      return null;
    }
    return id;
  }

  function nomeAtribuido(idOrigem: number | null) {
    if (!idOrigem) return null;
    return origemParaNome.get(idOrigem) || null;
  }

  let criadas = 0;
  let jaExistiam = 0;
  let nomes = 0;
  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.condominio_id', ${condominio.id}, true)`;
      for (const item of pacote.manutencoes || []) {
        const marca = await tx.importacaoOperacao.findUnique({
          where: {
            condominioId_tabela_idOrigem: {
              condominioId: condominio.id,
              tabela: "manutencao",
              idOrigem: String(item.id),
            },
          },
        });
        const nome = nomeAtribuido(item.assigned_to);
        destino(item.assigned_to);
        if (marca) {
          if (nome) {
            await tx.manutencao.update({
              where: { id: marca.idDestino },
              data: { responsavelNome: nome },
            });
            nomes += 1;
          }
          jaExistiam += 1;
          continue;
        }
        const criada = await tx.manutencao.create({
          data: {
            condominioId: condominio.id,
            tipo: item.maintenance_type === "PREVENTIVA" ? "PREVENTIVA" : "CORRETIVA",
            titulo: item.title,
            descricao: item.description,
            local: item.location,
            prioridade: item.priority || "NORMAL",
            dataPrevista: dataOuNull(item.scheduled_date),
            responsavelId: destino(item.assigned_to),
            responsavelNome: nome,
            status: item.status || "pendente",
            iniciadoEm: dataOuNull(item.started_at),
            concluidoEm: dataOuNull(item.completed_at),
            concluidoPorId: destino(item.completed_by),
            notasConclusao: item.completion_notes,
            custoCents: custoCents(item.cost),
            criadoPorId: destino(item.created_by),
            chaveIdempotencia: item.idempotency_key,
            criadoEm: dataOuNull(item.created_at) || undefined,
          },
          select: { id: true },
        });
        await tx.importacaoOperacao.create({
          data: {
            condominioId: condominio.id,
            tabela: "manutencao",
            idOrigem: String(item.id),
            idDestino: criada.id,
          },
        });
        criadas += 1;
      }
    },
    { timeout: 120_000 },
  );

  console.log(`Condomínio destino: ${condominio.nome} (${condominio.codigo})`);
  console.log(`Origem: ${pacote.condominio?.name || "não informada"}`);
  console.log(`Manutenções criadas: ${criadas}`);
  console.log(`Já importadas: ${jaExistiam}`);
  console.log(`Nomes de responsável gravados: ${nomes}`);
  console.log(`E-mails sem usuário neste dashboard: ${semPar.size ? [...semPar].join(", ") : "nenhum"}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
