import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/tenant";

const TIPOS = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);
const MAX_BYTES = 10 * 1024 * 1024;

export function pastaEvidencias(condominioId: string) {
  return path.join(process.cwd(), "storage", "evidencias", condominioId);
}

export async function gravarEvidencia(params: {
  condominioId: string;
  checklistId: string;
  itemId: string | null;
  usuarioId: string;
  arquivo: File;
}) {
  const checklist = await prisma.checklistDiario.findFirst({
    where: { id: params.checklistId, condominioId: params.condominioId },
    select: { id: true, status: true },
  });
  if (!checklist) throw new ApiError(404, "NAO_ENCONTRADO", "Checklist não encontrado.");
  if (checklist.status !== "IN_PROGRESS") {
    throw new ApiError(400, "VALIDACAO", "Envie foto só com o checklist em execução.");
  }
  if (params.itemId) {
    const item = await prisma.itemChecklistDiario.findFirst({
      where: { id: params.itemId, checklistId: checklist.id, condominioId: params.condominioId },
      select: { id: true },
    });
    if (!item) throw new ApiError(404, "NAO_ENCONTRADO", "Item não encontrado.");
  }
  const extensao = TIPOS.get(params.arquivo.type);
  if (!extensao) throw new ApiError(400, "VALIDACAO", "Envie uma imagem JPG, PNG ou WebP.");
  if (params.arquivo.size > MAX_BYTES) throw new ApiError(400, "VALIDACAO", "A foto passa de 10 MB.");
  const pasta = pastaEvidencias(params.condominioId);
  fs.mkdirSync(pasta, { recursive: true });
  const nome = `${crypto.randomUUID()}${extensao}`;
  const absoluto = path.join(pasta, nome);
  const bytes = Buffer.from(await params.arquivo.arrayBuffer());
  fs.writeFileSync(absoluto, bytes);
  return prisma.evidenciaChecklist.create({
    data: {
      condominioId: params.condominioId,
      checklistId: checklist.id,
      itemId: params.itemId,
      caminho: path.join("storage", "evidencias", params.condominioId, nome),
      nomeOriginal: path.basename(params.arquivo.name).slice(0, 180),
      tipo: params.arquivo.type,
      tamanho: bytes.length,
      enviadoPorId: params.usuarioId,
    },
    select: { id: true, itemId: true, nomeOriginal: true, criadoEm: true },
  });
}

export async function lerEvidencia(condominioId: string, id: string) {
  const evidencia = await prisma.evidenciaChecklist.findFirst({
    where: { id, condominioId },
  });
  if (!evidencia) throw new ApiError(404, "NAO_ENCONTRADO", "Foto não encontrada.");
  const raiz = path.resolve(process.cwd(), "storage", "evidencias", condominioId);
  const absoluto = path.resolve(process.cwd(), evidencia.caminho);
  const relativo = path.relative(raiz, absoluto);
  if (relativo.startsWith("..") || path.isAbsolute(relativo) || !fs.existsSync(absoluto)) {
    throw new ApiError(404, "NAO_ENCONTRADO", "Arquivo da foto não está no disco.");
  }
  return { absoluto, tipo: evidencia.tipo || "application/octet-stream" };
}
