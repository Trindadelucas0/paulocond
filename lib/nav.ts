export const MENU_GRUPOS = [
  {
    rotulo: "Visão",
    itens: [
      { id: "visao-geral", label: "Visão Geral", href: "/" },
      { id: "alertas", label: "Alertas", href: "/alertas" },
      { id: "detalhamento", label: "Detalhamento", href: "/detalhamento" },
    ],
  },
  {
    rotulo: "Análise",
    itens: [
      { id: "receitas", label: "Receitas", href: "/receitas" },
      { id: "despesas", label: "Despesas", href: "/despesas" },
      { id: "fluxo", label: "Fluxo Financeiro", href: "/fluxo" },
      { id: "taxa", label: "Taxa Condominial", href: "/taxa-condominial" },
      { id: "fundo", label: "Fundo de Reserva", href: "/fundo-reserva" },
      { id: "extras", label: "Taxas Extras", href: "/taxas-extras" },
      { id: "contratos", label: "Contratos", href: "/contratos" },
      { id: "utilidades", label: "Utilidades", href: "/utilidades" },
      { id: "manutencao", label: "Manutenção", href: "/manutencao" },
      { id: "patrimonio", label: "Patrimônio", href: "/patrimonio" },
      { id: "comparativo", label: "Comparativo 2025 x 2026", href: "/comparativo" },
      { id: "mensal", label: "Análise Mensal", href: "/analise-mensal" },
    ],
  },
  {
    rotulo: "Assembleia",
    itens: [
      { id: "relatorio", label: "Relatório da Assembleia", href: "/relatorio" },
      { id: "config", label: "Configurações", href: "/configuracoes" },
    ],
  },
] as const;
