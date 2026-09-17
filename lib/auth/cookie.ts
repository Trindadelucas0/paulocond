export const COOKIE_SESSAO = "sabia_sessao";
export const SESSAO_DIAS = 7;

export function cookieSessaoOpcoes() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.AUTH_COOKIE_SECURE === "true",
    path: "/",
    maxAge: SESSAO_DIAS * 24 * 60 * 60,
  };
}
