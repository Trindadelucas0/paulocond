import { prisma } from "@/lib/prisma";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function condominioDoCodigo() {
  const codigo = process.env.CONDOMINIO_CODIGO?.trim();
  if (!codigo) {
    throw new ApiError(400, "TENANT_AUSENTE", "Condomínio ativo não informado.");
  }
  const condominio = await prisma.condominio.findFirst({
    where: { codigo },
  });
  if (!condominio) {
    throw new ApiError(
      404,
      "TENANT_NAO_ENCONTRADO",
      "Condomínio não encontrado. Rode npm run importar.",
    );
  }
  return condominio;
}

export async function condominioAtivo(condominioId: string) {
  const esperado = await condominioDoCodigo();
  if (esperado.id !== condominioId) {
    throw new ApiError(403, "TENANT_INVALIDO", "Condomínio da sessão não corresponde ao ambiente.");
  }
  return esperado;
}

export function jsonError(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json(
      { success: false, error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }
  console.error(error);
  return Response.json(
    { success: false, error: { code: "INTERNAL", message: "Não foi possível concluir a solicitação." } },
    { status: 500 },
  );
}
