import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/tenant";
import {
  DEPARTAMENTOS,
  PRIORIDADES,
  TIPOS,
  dataIsoValida,
  diaDaSemana,
  podeFinalizarChecklist,
  podeTransitar,
  reaisParaCents,
  statusFinal,
} from "@/lib/operacao/regras";

const PAGINA = 50;

function custoInformado(valor: unknown) {
  try {
    return reaisParaCents(valor);
  } catch {
    throw new ApiError(400, "VALIDACAO", "Custo inválido.");
  }
}

function texto(valor: unknown, max: number, obrigatorio: boolean, rotulo: string) {
  const limpo = String(valor ?? "").trim();
  if (!limpo && obrigatorio) throw new ApiError(400, "VALIDACAO", `${rotulo} é obrigatório.`);
  if (limpo.length > max) throw new ApiError(400, "VALIDACAO", `${rotulo} passou do limite.`);
  return limpo || null;
}

function escolha<T extends string>(valor: unknown, lista: readonly T[], rotulo: string): T {
  const item = String(valor ?? "") as T;
  if (!lista.includes(item)) throw new ApiError(400, "VALIDACAO", `${rotulo} inválido.`);
  return item;
}

async function usuarioDoCondominio(condominioId: string, usuarioId: string | null) {
  if (!usuarioId) return null;
  const usuario = await prisma.usuario.findFirst({
    where: { id: usuarioId, condominioId, ativo: true },
    select: { id: true, nome: true },
  });
  if (!usuario) throw new ApiError(400, "VALIDACAO", "Responsável não pertence a este condomínio.");
  return usuario;
}

async function dadosResponsavel(condominioId: string, usuarioId: string | null) {
  const pessoa = await usuarioDoCondominio(condominioId, usuarioId);
  if (!pessoa) return { responsavelId: null, responsavelNome: null };
  return { responsavelId: pessoa.id, responsavelNome: pessoa.nome };
}

export async function listarUsuarios(condominioId: string) {
  return prisma.usuario.findMany({
    where: { condominioId, ativo: true },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, email: true },
  });
}

const includeManutencao = {
  responsavel: { select: { id: true, nome: true, email: true } },
  criadoPor: { select: { id: true, nome: true } },
} as const;

export async function resumoManutencoes(condominioId: string) {
  const where = { condominioId };
  const [porStatus, porTipo, porNome] = await Promise.all([
    prisma.manutencao.groupBy({ by: ["status"], where, _count: { _all: true } }),
    prisma.manutencao.groupBy({ by: ["tipo"], where, _count: { _all: true } }),
    prisma.manutencao.groupBy({ by: ["responsavelNome"], where, _count: { _all: true } }),
  ]);
  const statusDe = (valor: string) => porStatus.find((linha) => linha.status === valor)?._count._all || 0;
  const tipoDe = (valor: string) => porTipo.find((linha) => linha.tipo === valor)?._count._all || 0;
  const porResponsavel = porNome
    .map((linha) => ({ nome: linha.responsavelNome || "Sem responsável", total: linha._count._all }))
    .sort((a, b) => b.total - a.total);
  return {
    total: porStatus.reduce((soma, linha) => soma + linha._count._all, 0),
    pendente: statusDe("pendente"),
    emAndamento: statusDe("em_andamento"),
    concluida: statusDe("concluida"),
    cancelada: statusDe("cancelada"),
    preventiva: tipoDe("PREVENTIVA"),
    corretiva: tipoDe("CORRETIVA"),
    porResponsavel,
  };
}

const LIMITE_EXPORTACAO = 5000;

export function whereManutencoes(
  condominioId: string,
  filtros: { tipo?: string; status?: string; busca?: string; responsavel?: string },
) {
  const responsavel = filtros.responsavel?.trim().slice(0, 120);
  const busca = filtros.busca?.trim().slice(0, 120);
  return {
    condominioId,
    ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
    ...(filtros.status ? { status: filtros.status } : {}),
    ...(responsavel
      ? responsavel === "Sem responsável"
        ? { responsavelNome: null, responsavelId: null }
        : { responsavelNome: responsavel }
      : {}),
    ...(busca ? { titulo: { contains: busca, mode: "insensitive" as const } } : {}),
  };
}

export async function listarManutencoes(
  condominioId: string,
  filtros: { tipo?: string; status?: string; busca?: string; responsavel?: string; pagina?: number },
) {
  const pagina = Math.max(1, filtros.pagina || 1);
  const where = whereManutencoes(condominioId, filtros);
  const [total, itens, resumo] = await Promise.all([
    prisma.manutencao.count({ where }),
    prisma.manutencao.findMany({
      where,
      include: includeManutencao,
      orderBy: { dataPrevista: "desc" },
      skip: (pagina - 1) * PAGINA,
      take: PAGINA,
    }),
    resumoManutencoes(condominioId),
  ]);
  return { itens, total, pagina, paginas: Math.max(1, Math.ceil(total / PAGINA)), resumo };
}

export async function listarManutencoesExportacao(
  condominioId: string,
  filtros: { tipo?: string; status?: string; busca?: string; responsavel?: string },
) {
  const where = whereManutencoes(condominioId, filtros);
  const total = await prisma.manutencao.count({ where });
  if (total > LIMITE_EXPORTACAO) {
    throw new ApiError(400, "VALIDACAO", "O filtro tem registros demais para exportar. Refine a busca.");
  }
  return prisma.manutencao.findMany({
    where,
    include: includeManutencao,
    orderBy: { dataPrevista: "desc" },
    take: LIMITE_EXPORTACAO,
  });
}

export async function obterManutencao(condominioId: string, id: string) {
  const item = await prisma.manutencao.findFirst({
    where: { id, condominioId },
    include: includeManutencao,
  });
  if (!item) throw new ApiError(404, "NAO_ENCONTRADO", "Manutenção não encontrada.");
  return item;
}

export async function criarManutencao(
  condominioId: string,
  usuarioId: string,
  body: Record<string, unknown>,
) {
  const chave = texto(body.chaveIdempotencia, 120, false, "Chave");
  if (chave) {
    const existente = await prisma.manutencao.findFirst({
      where: { condominioId, criadoPorId: usuarioId, chaveIdempotencia: chave },
      include: includeManutencao,
    });
    if (existente) return existente;
  }
  const dataPrevista = body.dataPrevista ? String(body.dataPrevista) : "";
  if (dataPrevista && !dataIsoValida(dataPrevista)) {
    throw new ApiError(400, "VALIDACAO", "Data prevista inválida.");
  }
  return prisma.manutencao.create({
    data: {
      condominioId,
      tipo: escolha(body.tipo, TIPOS, "Tipo"),
      titulo: texto(body.titulo, 255, true, "Título")!,
      descricao: texto(body.descricao, 4000, true, "Descrição")!,
      local: texto(body.local, 255, false, "Local"),
      prioridade: body.prioridade ? escolha(body.prioridade, PRIORIDADES, "Prioridade") : "NORMAL",
      dataPrevista: dataPrevista ? new Date(`${dataPrevista}T00:00:00.000Z`) : null,
      ...(await dadosResponsavel(condominioId, body.responsavelId ? String(body.responsavelId) : null)),
      custoCents: custoInformado(body.custo),
      criadoPorId: usuarioId,
      chaveIdempotencia: chave,
      status: "pendente",
    },
    include: includeManutencao,
  });
}

export async function editarManutencao(condominioId: string, id: string, body: Record<string, unknown>) {
  const atual = await obterManutencao(condominioId, id);
  if (statusFinal(atual.status)) {
    throw new ApiError(400, "VALIDACAO", "Manutenção encerrada não pode ser editada.");
  }
  const dataPrevista = body.dataPrevista === undefined ? undefined : String(body.dataPrevista || "");
  if (dataPrevista && !dataIsoValida(dataPrevista)) {
    throw new ApiError(400, "VALIDACAO", "Data prevista inválida.");
  }
  return prisma.manutencao.update({
    where: { id: atual.id },
    data: {
      tipo: body.tipo ? escolha(body.tipo, TIPOS, "Tipo") : undefined,
      titulo: body.titulo !== undefined ? texto(body.titulo, 255, true, "Título")! : undefined,
      descricao: body.descricao !== undefined ? texto(body.descricao, 4000, true, "Descrição")! : undefined,
      local: body.local !== undefined ? texto(body.local, 255, false, "Local") : undefined,
      prioridade: body.prioridade ? escolha(body.prioridade, PRIORIDADES, "Prioridade") : undefined,
      dataPrevista:
        dataPrevista === undefined ? undefined : dataPrevista ? new Date(`${dataPrevista}T00:00:00.000Z`) : null,
      ...(body.responsavelId !== undefined
        ? await dadosResponsavel(condominioId, body.responsavelId ? String(body.responsavelId) : null)
        : {}),
      custoCents: body.custo !== undefined ? custoInformado(body.custo) : undefined,
    },
    include: includeManutencao,
  });
}

export async function mudarStatusManutencao(
  condominioId: string,
  id: string,
  usuarioId: string,
  para: "em_andamento" | "concluida" | "cancelada",
  notas?: string,
) {
  const atual = await obterManutencao(condominioId, id);
  if (!podeTransitar(atual.status, para)) {
    throw new ApiError(400, "VALIDACAO", "Essa mudança de status não é permitida.");
  }
  return prisma.manutencao.update({
    where: { id: atual.id },
    data: {
      status: para,
      iniciadoEm: para === "em_andamento" ? new Date() : undefined,
      concluidoEm: para === "concluida" || para === "cancelada" ? new Date() : undefined,
      concluidoPorId: para === "concluida" || para === "cancelada" ? usuarioId : undefined,
      notasConclusao: para === "concluida" ? texto(notas, 4000, false, "Notas") : undefined,
    },
    include: includeManutencao,
  });
}

export async function excluirManutencao(condominioId: string, id: string) {
  const atual = await obterManutencao(condominioId, id);
  if (statusFinal(atual.status)) {
    throw new ApiError(400, "VALIDACAO", "Manutenção encerrada não pode ser excluída.");
  }
  await prisma.manutencao.delete({ where: { id: atual.id } });
}

function lerItens(body: Record<string, unknown>) {
  if (!Array.isArray(body.itens) || body.itens.length === 0) {
    throw new ApiError(400, "VALIDACAO", "Inclua ao menos um item.");
  }
  return body.itens.map((bruto, indice) => {
    const item = bruto as Record<string, unknown>;
    const nome = texto(item.nome, 255, true, "Item");
    return { nome: nome!, ordem: indice, exigeFoto: Boolean(item.exigeFoto) };
  });
}

function lerDias(body: Record<string, unknown>) {
  if (!Array.isArray(body.diasSemana) || body.diasSemana.length === 0) {
    throw new ApiError(400, "VALIDACAO", "Escolha ao menos um dia da semana.");
  }
  const dias = [...new Set(body.diasSemana.map((dia) => Number(dia)))].filter((dia) => dia >= 0 && dia <= 6);
  if (dias.length === 0) throw new ApiError(400, "VALIDACAO", "Dias da semana inválidos.");
  return dias.sort((a, b) => a - b);
}

async function idsAtribuidos(condominioId: string, body: Record<string, unknown>) {
  const ids = Array.isArray(body.usuariosIds) ? body.usuariosIds.map(String) : [];
  if (ids.length === 0) return [];
  const achados = await prisma.usuario.findMany({
    where: { condominioId, ativo: true, id: { in: ids } },
    select: { id: true },
  });
  if (achados.length !== new Set(ids).size) {
    throw new ApiError(400, "VALIDACAO", "Há pessoa atribuída que não pertence a este condomínio.");
  }
  return achados.map((item) => item.id);
}

const includeModelo = {
  itens: { orderBy: { ordem: "asc" as const } },
  atribuicoes: { include: { usuario: { select: { id: true, nome: true, email: true } } } },
};

export async function listarModelos(condominioId: string) {
  return prisma.modeloChecklist.findMany({
    where: { condominioId },
    include: includeModelo,
    orderBy: { nome: "asc" },
  });
}

export async function criarModelo(condominioId: string, usuarioId: string, body: Record<string, unknown>) {
  const itens = lerItens(body);
  const usuarios = await idsAtribuidos(condominioId, body);
  return prisma.modeloChecklist.create({
    data: {
      condominioId,
      nome: texto(body.nome, 255, true, "Nome")!,
      descricao: texto(body.descricao, 2000, false, "Descrição"),
      departamento: escolha(body.departamento, DEPARTAMENTOS, "Departamento"),
      diasSemana: lerDias(body),
      exigeFoto: body.exigeFoto !== false,
      exigeJustificativa: body.exigeJustificativa !== false,
      criadoPorId: usuarioId,
      itens: { create: itens.map((item) => ({ ...item, condominioId })) },
      atribuicoes: { create: usuarios.map((id) => ({ condominioId, usuarioId: id })) },
    },
    include: includeModelo,
  });
}

export async function editarModelo(condominioId: string, id: string, body: Record<string, unknown>) {
  const atual = await prisma.modeloChecklist.findFirst({ where: { id, condominioId } });
  if (!atual) throw new ApiError(404, "NAO_ENCONTRADO", "Modelo não encontrado.");
  const itens = body.itens ? lerItens(body) : null;
  const usuarios = body.usuariosIds ? await idsAtribuidos(condominioId, body) : null;
  return prisma.$transaction(async (tx) => {
    if (itens) {
      await tx.itemModeloChecklist.deleteMany({ where: { modeloId: atual.id, condominioId } });
      await tx.itemModeloChecklist.createMany({
        data: itens.map((item) => ({ ...item, modeloId: atual.id, condominioId })),
      });
    }
    if (usuarios) {
      await tx.atribuicaoModeloChecklist.deleteMany({ where: { modeloId: atual.id, condominioId } });
      if (usuarios.length) {
        await tx.atribuicaoModeloChecklist.createMany({
          data: usuarios.map((usuarioId) => ({ modeloId: atual.id, condominioId, usuarioId })),
        });
      }
    }
    return tx.modeloChecklist.update({
      where: { id: atual.id },
      data: {
        nome: body.nome !== undefined ? texto(body.nome, 255, true, "Nome")! : undefined,
        descricao: body.descricao !== undefined ? texto(body.descricao, 2000, false, "Descrição") : undefined,
        departamento: body.departamento ? escolha(body.departamento, DEPARTAMENTOS, "Departamento") : undefined,
        diasSemana: body.diasSemana ? lerDias(body) : undefined,
        exigeFoto: body.exigeFoto !== undefined ? Boolean(body.exigeFoto) : undefined,
        exigeJustificativa: body.exigeJustificativa !== undefined ? Boolean(body.exigeJustificativa) : undefined,
        ativo: body.ativo !== undefined ? Boolean(body.ativo) : undefined,
      },
      include: includeModelo,
    });
  });
}

export async function alternarModelo(condominioId: string, id: string) {
  const atual = await prisma.modeloChecklist.findFirst({ where: { id, condominioId } });
  if (!atual) throw new ApiError(404, "NAO_ENCONTRADO", "Modelo não encontrado.");
  return prisma.modeloChecklist.update({
    where: { id: atual.id },
    data: { ativo: !atual.ativo },
    include: includeModelo,
  });
}

function inicioDoDiaUtc(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`);
}

export async function garantirChecklistsDoDia(condominioId: string, iso: string) {
  if (!dataIsoValida(iso)) throw new ApiError(400, "VALIDACAO", "Data inválida.");
  const dia = diaDaSemana(iso)!;
  const modelos = await prisma.modeloChecklist.findMany({
    where: { condominioId, ativo: true },
    include: { itens: { orderBy: { ordem: "asc" } }, atribuicoes: true },
  });
  const data = inicioDoDiaUtc(iso);
  for (const modelo of modelos) {
    if (!modelo.diasSemana.includes(dia)) continue;
    const responsaveis = modelo.atribuicoes.length
      ? modelo.atribuicoes.map((item) => item.usuarioId)
      : [null];
    for (const responsavelId of responsaveis) {
      const existe = await prisma.checklistDiario.findFirst({
        where: { condominioId, modeloId: modelo.id, data, responsavelId },
      });
      if (existe) continue;
      await prisma.checklistDiario.create({
        data: {
          condominioId,
          modeloId: modelo.id,
          data,
          responsavelId,
          status: "PENDING",
          itens: {
            create: modelo.itens.map((item) => ({
              condominioId,
              nome: item.nome,
              ordem: item.ordem,
              exigeFoto: item.exigeFoto,
            })),
          },
        },
      });
    }
  }
}

const includeChecklist = {
  modelo: { select: { id: true, nome: true, departamento: true, exigeFoto: true, exigeJustificativa: true } },
  responsavel: { select: { id: true, nome: true } },
  itens: { orderBy: { ordem: "asc" as const } },
  evidencias: { select: { id: true, itemId: true, nomeOriginal: true, criadoEm: true } },
};

export async function listarChecklists(condominioId: string, iso: string, departamento?: string) {
  await garantirChecklistsDoDia(condominioId, iso);
  return prisma.checklistDiario.findMany({
    where: {
      condominioId,
      data: inicioDoDiaUtc(iso),
      ...(departamento ? { modelo: { departamento } } : {}),
    },
    include: includeChecklist,
    orderBy: { criadoEm: "asc" },
  });
}

export async function obterChecklist(condominioId: string, id: string) {
  const item = await prisma.checklistDiario.findFirst({
    where: { id, condominioId },
    include: includeChecklist,
  });
  if (!item) throw new ApiError(404, "NAO_ENCONTRADO", "Checklist não encontrado.");
  return item;
}

export async function iniciarChecklist(condominioId: string, id: string) {
  const atual = await obterChecklist(condominioId, id);
  if (atual.status !== "PENDING") throw new ApiError(400, "VALIDACAO", "Este checklist já foi iniciado.");
  return prisma.checklistDiario.update({
    where: { id: atual.id },
    data: { status: "IN_PROGRESS", iniciadoEm: new Date() },
    include: includeChecklist,
  });
}

export async function atualizarItemChecklist(
  condominioId: string,
  checklistId: string,
  itemId: string,
  body: Record<string, unknown>,
) {
  const checklist = await obterChecklist(condominioId, checklistId);
  if (checklist.status === "COMPLETED" || checklist.status === "CANCELLED") {
    throw new ApiError(400, "VALIDACAO", "Checklist encerrado não aceita alteração.");
  }
  if (checklist.status === "PENDING") {
    throw new ApiError(400, "VALIDACAO", "Inicie o checklist antes de marcar itens.");
  }
  const item = checklist.itens.find((linha) => linha.id === itemId);
  if (!item) throw new ApiError(404, "NAO_ENCONTRADO", "Item não encontrado.");
  const status = body.status ? String(body.status) : item.status;
  if (!["PENDING", "DONE", "NOT_DONE"].includes(status)) {
    throw new ApiError(400, "VALIDACAO", "Status do item inválido.");
  }
  const comentario = body.comentario !== undefined ? texto(body.comentario, 2000, false, "Observação") : item.comentario;
  if (status === "NOT_DONE" && checklist.modelo.exigeJustificativa && !comentario?.trim()) {
    throw new ApiError(400, "VALIDACAO", "Informe a justificativa do item não feito.");
  }
  await prisma.itemChecklistDiario.update({
    where: { id: item.id },
    data: {
      status,
      comentario,
      feitoEm: status === "PENDING" ? null : new Date(),
    },
  });
  return obterChecklist(condominioId, checklistId);
}

export async function questionarItem(condominioId: string, usuarioId: string, itemId: string, textoPergunta: unknown) {
  const pergunta = texto(textoPergunta, 2000, true, "Questionamento");
  const item = await prisma.itemChecklistDiario.findFirst({ where: { id: itemId, condominioId } });
  if (!item) throw new ApiError(404, "NAO_ENCONTRADO", "Item não encontrado.");
  if (item.status !== "NOT_DONE") {
    throw new ApiError(400, "VALIDACAO", "Só é possível questionar item não feito.");
  }
  await prisma.itemChecklistDiario.update({
    where: { id: item.id },
    data: { questionamento: pergunta, questionadoEm: new Date(), questionadoPorId: usuarioId },
  });
  return obterChecklist(condominioId, item.checklistId);
}

export async function finalizarChecklist(condominioId: string, id: string, usuarioId: string) {
  const atual = await obterChecklist(condominioId, id);
  if (atual.status !== "IN_PROGRESS") {
    throw new ApiError(400, "VALIDACAO", "Finalize só um checklist em execução.");
  }
  const fotosPorItem = new Map<string, number>();
  for (const evidencia of atual.evidencias) {
    if (!evidencia.itemId) continue;
    fotosPorItem.set(evidencia.itemId, (fotosPorItem.get(evidencia.itemId) || 0) + 1);
  }
  const erro = podeFinalizarChecklist(
    atual.itens.map((item) => ({
      status: item.status,
      comentario: item.comentario,
      exigeFoto: item.exigeFoto,
      fotos: fotosPorItem.get(item.id) || 0,
    })),
    atual.modelo.exigeJustificativa,
    atual.modelo.exigeFoto,
  );
  if (erro) throw new ApiError(400, "VALIDACAO", erro);
  return prisma.checklistDiario.update({
    where: { id: atual.id },
    data: { status: "COMPLETED", concluidoEm: new Date(), concluidoPorId: usuarioId },
    include: includeChecklist,
  });
}
