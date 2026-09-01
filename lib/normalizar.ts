export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function nomeCanonico(rotuloCru: string): string {
  return rotuloCru
    .normalize("NFC")
    .replace(/^\s*-\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function naturezaDoGrupo(grupo: string, tipo: "RECEITA" | "DESPESA"): string {
  const g = grupo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  if (g.includes("FUNDO DE RESERVA")) return "FUNDO_RESERVA";
  if (g.includes("TAXA EXTRA") || g.includes("TAXAS EXTRAS")) return "TAXA_EXTRA";
  if (g.includes("EVENTUAL")) return "EVENTUAL";
  if (tipo === "RECEITA" && (g.includes("ALUGU") || g.includes("FINANCEIR"))) return "ORDINARIA";
  return "ORDINARIA";
}

export function grupoCanonico(grupoCru: string, tipo: "RECEITA" | "DESPESA"): string {
  const nome = nomeCanonico(grupoCru)
    .replace(/^RECEITAS DE\s+/i, "")
    .replace(/^DESPESAS( COM| DE)?\s+/i, "")
    .replace(/^R E C E I T A S$/i, tipo === "RECEITA" ? "Receitas" : "Despesas")
    .replace(/\s+/g, " ")
    .trim();

  const map: Record<string, string> = {
    "COTAS ORDINARIA": "Cotas ordinárias",
    "COTAS ORDINÁRIA": "Cotas ordinárias",
    "FUNDO DE RESERVA": "Fundo de reserva",
    "TAXAS EXTRAS": "Taxas extras",
    "ALUGUEIS": "Aluguéis",
    "ALUGUÉIS": "Aluguéis",
    "FINANCEIRAS": "Financeiras",
    "EVENTUAIS": "Eventuais",
    "TARIFAS PUBLICAS - CONCESSIONARIAS": "Tarifas públicas",
    "TARIFAS PÚBLICAS - CONCESSIONÁRIAS": "Tarifas públicas",
    "CONTRATOS FIXOS": "Contratos fixos",
    "PESSOAL": "Pessoal",
    "ADMINISTRATIVAS": "Administrativas",
    "MANUTENCAO": "Manutenção",
    "MANUTENÇÃO": "Manutenção",
    "IMPOSTOS TAXAS E CONTRIBUICOES": "Impostos",
    "IMPOSTOS TAXAS E CONTRIBUIÇÕES": "Impostos",
    "BENS PATRIMONIAIS": "Patrimônio",
  };

  const key = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  return map[nome.toUpperCase()] ?? map[key] ?? nome;
}
