import { redirect } from "next/navigation";
import { SemPermissao } from "@/components/auth/SemPermissao";
import { ContaSenhaForm } from "@/components/paginas/ContaSenhaForm";
import { podeTrocarSenha } from "@/lib/auth/papeis";
import { sessaoDoServidor } from "@/lib/auth/sessao";

export default async function ContaPage() {
  const sessao = await sessaoDoServidor();
  if (!sessao) redirect("/login");
  if (!podeTrocarSenha(sessao.usuario.papel)) {
    return <SemPermissao detalhe="Apenas administradores alteram senha." />;
  }
  return <ContaSenhaForm />;
}
