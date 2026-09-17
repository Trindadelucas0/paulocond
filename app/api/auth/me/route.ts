export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { jsonError } from "@/lib/tenant";
import { perfilPublico, requireAuth } from "@/lib/auth/sessao";

export async function GET(request: NextRequest) {
  try {
    const sessao = await requireAuth(request);
    return Response.json({ success: true, data: perfilPublico(sessao) });
  } catch (error) {
    return jsonError(error);
  }
}
