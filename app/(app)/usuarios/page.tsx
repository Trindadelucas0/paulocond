import { redirect } from "next/navigation";
import { SemPermissao } from "@/components/auth/SemPermissao";
import { PaginaUsuarios } from "@/components/paginas/PaginaUsuarios";
import { PAPEL_ADMIN } from "@/lib/auth/papeis";
import { sessaoDoServidor } from "@/lib/auth/sessao";

export default async function UsuariosPage() {
  const sessao = await sessaoDoServidor();
  if (!sessao) redirect("/login");
  if (sessao.usuario.papel !== PAPEL_ADMIN) {
    return <SemPermissao detalhe="Apenas administradores gerenciam usuários." />;
  }
  return <PaginaUsuarios euId={sessao.usuario.id} />;
}
