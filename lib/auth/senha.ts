import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { SENHA_MINIMA } from "@/lib/auth/papeis";

export { SENHA_MINIMA };

const KEYLEN = 64;

function scrypt(
  senha: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(senha, salt, keylen, options, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
    });
  });
}
const DUMMY_HASH =
  "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export function senhaMinimaOk(senha: string) {
  return senha.length >= SENHA_MINIMA;
}

export async function hashSenha(senha: string): Promise<string> {
  const salt = randomBytes(32);
  const key = await scrypt(senha, salt, KEYLEN, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verificarSenha(senha: string, senhaHash: string | null): Promise<boolean> {
  const parsed = parseHash(senhaHash ?? DUMMY_HASH);
  const key = await scrypt(senha, parsed.salt, KEYLEN, {
    N: parsed.N,
    r: parsed.r,
    p: parsed.p,
  });
  if (!senhaHash || senhaHash === DUMMY_HASH) {
    timingSafeEqual(key, key);
    return false;
  }
  if (key.length !== parsed.key.length) {
    timingSafeEqual(key, key);
    return false;
  }
  return timingSafeEqual(key, parsed.key);
}

function parseHash(hash: string) {
  const parts = hash.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    const salt = Buffer.alloc(32);
    const key = Buffer.alloc(KEYLEN);
    return { N: 16384, r: 8, p: 1, salt, key };
  }
  return {
    N: Number(parts[1]) || 16384,
    r: Number(parts[2]) || 8,
    p: Number(parts[3]) || 1,
    salt: Buffer.from(parts[4], "base64url"),
    key: Buffer.from(parts[5], "base64url"),
  };
}
