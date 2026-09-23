import { PaginaModelos } from "@/components/operacao/PaginaModelos";
import { PAPEL_ADMIN } from "@/lib/auth/papeis";
import { sessaoDoServidor } from "@/lib/auth/sessao";
import { redirect } from "next/navigation";

export default async function Pagina() {
  const sessao = await sessaoDoServidor();
  if (!sessao) redirect("/login");
  return <PaginaModelos admin={sessao.usuario.papel === PAPEL_ADMIN} />;
}
