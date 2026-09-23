import { PaginaChecklists } from "@/components/operacao/PaginaChecklists";
import { PAPEL_ADMIN } from "@/lib/auth/papeis";
import { sessaoDoServidor } from "@/lib/auth/sessao";
import { redirect } from "next/navigation";

export default async function Pagina() {
  const sessao = await sessaoDoServidor();
  if (!sessao) redirect("/login");
  return <PaginaChecklists admin={sessao.usuario.papel === PAPEL_ADMIN} />;
}
