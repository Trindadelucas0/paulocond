"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MENU_GRUPOS } from "@/lib/nav";
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
};

type Props = {
  aberto: boolean;
  onClose: () => void;
};

function itemAtivo(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ aberto, onClose }: Props) {
  const pathname = usePathname();

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
        className={`fixed inset-y-0 left-0 z-40 flex w-[272px] flex-col border-r border-line bg-surface px-4 py-5 transition-transform print:hidden lg:translate-x-0 ${
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
                {grupo.itens.map((item) => {
                  const Icon = ICONS[item.id] ?? LayoutDashboard;
                  const ativo = itemAtivo(pathname, item.href);
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm ${
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
        <p className="mt-4 px-3 text-[11px] text-muted">Prestação de contas · leitura local</p>
      </aside>
    </>
  );
}
