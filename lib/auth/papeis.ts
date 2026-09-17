export const PAPEL_ADMIN = "ADMIN";
export const PAPEL_LEITURA = "LEITURA";
export const SENHA_MINIMA = 10;

export const PAPEIS = [PAPEL_ADMIN, PAPEL_LEITURA] as const;
export type Papel = (typeof PAPEIS)[number];

export function isPapel(valor: string): valor is Papel {
  return (PAPEIS as readonly string[]).includes(valor);
}

export function rotuloPapel(papel: string) {
  return papel === PAPEL_ADMIN ? "Admin" : "Leitura";
}

export function podeVerConfig(papel: string) {
  return papel === PAPEL_ADMIN;
}

export function podeTrocarSenha(papel: string) {
  return papel === PAPEL_ADMIN;
}

export function bloqueiaUltimoAdmin(params: {
  alvoEhAdminAtivo: boolean;
  adminsAtivos: number;
  novoAtivo?: boolean;
  novoPapel?: string;
}): boolean {
  if (!params.alvoEhAdminAtivo) return false;
  if (params.adminsAtivos > 1) return false;
  if (params.novoAtivo === false) return true;
  if (params.novoPapel && params.novoPapel !== PAPEL_ADMIN) return true;
  return false;
}
