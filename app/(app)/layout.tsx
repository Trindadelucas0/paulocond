import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { sessaoDoServidor } from "@/lib/auth/sessao";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const sessao = await sessaoDoServidor();
  if (!sessao) {
    redirect("/login");
  }
  return (
    <AppShell
      usuario={{
        id: sessao.usuario.id,
        nome: sessao.usuario.nome,
        papel: sessao.usuario.papel,
      }}
    >
      {children}
    </AppShell>
  );
}
