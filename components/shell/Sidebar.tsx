"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MENU_GRUPOS } from "@/lib/nav";
import { PAPEL_ADMIN, rotuloPapel } from "@/lib/auth/papeis";
import { BrandLogo } from "./BrandLogo";
import {
  Bell,
  Building2,
  Droplets,
  FileText,
  Flame,
  LayoutDashboard,
  LineChart,
  Settings,
  Shield,
  Table2,
  Wallet,
  Wrench,
  CalendarRange,
  Landmark,
  PiggyBank,
  Receipt,
  Scale,
  Users,
} from "lucide-react";

const ICONS: Record<string, typeof LayoutDashboard> = {
  "visao-geral": LayoutDashboard,
  alertas: Bell,
  detalhamento: Table2,
  receitas: Wallet,
  despesas: Receipt,
  fluxo: LineChart,
  taxa: Landmark,
  fundo: PiggyBank,
  extras: Flame,
  contratos: FileText,
  utilidades: Droplets,
  manutencao: Wrench,
  patrimonio: Building2,
  comparativo: Scale,
  mensal: CalendarRange,
  relatorio: Shield,
  config: Settings,
  usuarios: Users,
};

type Props = {
  aberto: boolean;
  onClose: () => void;
  usuario: { id: string; nome: string; papel: string };
};

function itemAtivo(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ aberto, onClose, usuario }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const ehAdmin = usuario.papel === PAPEL_ADMIN;

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      {aberto ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-ink/40 lg:hidden print:hidden"
          aria-label="Fechar menu"
          onClick={onClose}
        />
      ) : null}
      <aside
        id="menu-lateral"
        className={`fixed inset-y-0 left-0 z-40 flex w-[min(100%,var(--sidebar-w))] flex-col border-r border-line bg-surface px-3 py-4 transition-transform print:hidden lg:translate-x-0 ${
          aberto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <BrandLogo variant="sidebar" />

        <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1" aria-label="Navegação principal">
          {MENU_GRUPOS.map((grupo) => (
            <div key={grupo.rotulo}>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                {grupo.rotulo}
              </p>
              <ul className="space-y-1">
                {grupo.itens
                  .filter((item) => (item.id !== "usuarios" && item.id !== "config") || ehAdmin)
                  .map((item) => {
                    const Icon = ICONS[item.id] ?? LayoutDashboard;
                    const ativo = itemAtivo(pathname, item.href);
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={`flex min-h-10 items-center gap-2.5 rounded-2xl px-2.5 py-2 text-sm ${
                            ativo ? "bg-forest font-semibold text-white" : "font-medium text-ink hover:bg-page"
                          }`}
                          aria-current={ativo ? "page" : undefined}
                        >
                          <Icon className="h-4 w-4" aria-hidden />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="mt-4 border-t border-line px-3 pt-3">
          <p className="text-sm font-medium text-ink">{usuario.nome}</p>
          <p className="text-[11px] text-muted">{rotuloPapel(usuario.papel)}</p>
          {ehAdmin ? (
            <Link
              href="/conta"
              onClick={onClose}
              className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-forest"
            >
              Minha senha
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => void sair()}
            className="mt-1 flex min-h-11 w-full items-center rounded-2xl text-left text-sm font-medium text-ink hover:bg-page"
          >
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
