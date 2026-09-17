import { hashSenha, senhaMinimaOk } from "../lib/auth/senha";
import { PAPEL_ADMIN } from "../lib/auth/papeis";
import { prisma } from "../lib/prisma";
import { condominioDoCodigo } from "../lib/tenant";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const senha = process.env.SEED_ADMIN_PASSWORD ?? "";
  const nome = process.env.SEED_ADMIN_NOME?.trim() || "Administrador";

  if (!email || !email.includes("@")) {
    console.error("Defina SEED_ADMIN_EMAIL no .env.");
    process.exit(1);
  }
  if (!senhaMinimaOk(senha)) {
    console.error("SEED_ADMIN_PASSWORD deve ter no mínimo 10 caracteres.");
    process.exit(1);
  }

  const condominio = await condominioDoCodigo();
  const existente = await prisma.usuario.findFirst({
    where: { condominioId: condominio.id, email },
  });
  if (existente) {
    console.log("Admin já existe para este e-mail. Nada a fazer.");
    return;
  }

  await prisma.usuario.create({
    data: {
      condominioId: condominio.id,
      nome,
      email,
      senhaHash: await hashSenha(senha),
      papel: PAPEL_ADMIN,
      ativo: true,
    },
  });
  console.log("Admin criado. Entre em /login com o e-mail definido em SEED_ADMIN_EMAIL.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
