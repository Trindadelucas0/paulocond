import { redirect } from "next/navigation";
import { SemPermissao } from "@/components/auth/SemPermissao";
import { PaginaAnalise } from "@/components/paginas/PaginaAnalise";
import { podeVerConfig } from "@/lib/auth/papeis";
import { sessaoDoServidor } from "@/lib/auth/sessao";

export default async function ConfiguracoesPage() {
  const sessao = await sessaoDoServidor();
  if (!sessao) redirect("/login");
  if (!podeVerConfig(sessao.usuario.papel)) {
    return <SemPermissao detalhe="Apenas administradores veem as configurações." />;
  }
  return <PaginaAnalise modulo="configuracoes" />;
}
