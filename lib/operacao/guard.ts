import { NextRequest } from "next/server";
import { origemPermitida } from "@/lib/auth/origem";
import { requireAdmin, requireAuth } from "@/lib/auth/sessao";
import { ApiError, jsonError } from "@/lib/tenant";

export async function lerAdmin(request: NextRequest) {
  if (!origemPermitida(request)) {
    throw new ApiError(403, "ORIGEM_INVALIDA", "Origem da requisição não permitida.");
  }
  return requireAdmin(request);
}

export async function lerSessao(request: NextRequest) {
  return requireAuth(request);
}

export function responder(error: unknown) {
  return jsonError(error);
}
