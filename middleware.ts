import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_SESSAO } from "@/lib/auth/cookie";

const PUBLICOS = new Set(["/login", "/api/auth/login", "/api/auth/logout"]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const temCookie = Boolean(request.cookies.get(COOKIE_SESSAO)?.value);
  const publico = PUBLICOS.has(pathname);

  if (pathname === "/login" && temCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (publico) return NextResponse.next();

  if (!temCookie) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: { code: "NAO_AUTENTICADO", message: "Faça login para continuar." } },
        { status: 401 },
      );
    }
    const login = new URL("/login", request.url);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|marca/|favicon.ico).*)"],
};
