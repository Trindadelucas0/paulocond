"use client";

import { useState } from "react";
import { BrandLogo } from "./BrandLogo";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="min-h-dvh bg-page">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-forest focus:px-4 focus:py-2 focus:text-white"
      >
        Ir para o conteúdo
      </a>
      <Sidebar aberto={aberto} onClose={() => setAberto(false)} />
      <div className="print:pl-0 lg:pl-[var(--sidebar-w)]">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-line/80 bg-page/90 px-3 py-2 backdrop-blur print:hidden sm:px-4 lg:hidden">
          <button
            type="button"
            className="min-h-11 rounded-full border border-line bg-surface px-3 py-2 text-sm font-medium"
            onClick={() => setAberto(true)}
            aria-expanded={aberto}
            aria-controls="menu-lateral"
          >
            Menu
          </button>
          <BrandLogo variant="header" />
          <span className="w-14 shrink-0" aria-hidden />
        </header>
        <main id="conteudo" className="page-canvas min-w-0 px-3 py-4 sm:px-5 lg:px-6 lg:py-5">
          {children}
        </main>
      </div>
    </div>
  );
}
