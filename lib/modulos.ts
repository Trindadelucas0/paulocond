import type { Periodo, TotalOficial } from "@prisma/client";
import { montarAlertas } from "@/lib/alertas";
import { avisoComparativoJanJul, montarComparativoConsumo, totaisConsumoJanJul } from "@/lib/consumo";
import { montarCoberturaCota, type CoberturaCotaPayload } from "@/lib/cobertura-cota";
import { montarInadimplencia, type InadimplenciaPayload } from "@/lib/inadimplencia";
import {
  composicaoGrupo,
  janJul,
  noRecorte,
  periodosDoRecorte,
  rankingItens,
  serieMensalTipo,
  somaGrupo,
  somaNome,
  somaTipo,
  totaisRecorte,
} from "@/lib/dataset";
import { formatBRL, formatPct, formatPercentualBp, mesLabel, type ModuloId, type OrdemId, type RecorteId } from "@/lib/format";
import { SALDO_FUNDO_RESERVA_CENTS } from "@/lib/money";
import type { Alerta, Fatia, LancamentoComRel } from "@/lib/kpis";

export type RankingItem = {
  nome: string;
  grupo: string;
  valorCents: number;
  participacao: number;
  destaque?: boolean;
};

export type SeriePonto = {
  competencia: string;
  receitaCents: number;
  despesaCents: number;
  resultadoCents: number;
  saldoCents: number;
  valorCents: number;
  qualidade: string;
};

export type WaterfallStep = {
  rotulo: string;
  valorCents: number;
  tipo: "base" | "positivo" | "negativo" | "total";
};

export type DestaqueCard = {
  id: string;
  rotulo: string;
  valorCents: number;
  extra?: string;
  nota?: string;
};

export type ComparativoLinha = {
  rotulo: string;
  cents2025: number;
  cents2026: number;
  variacaoPct: number | null;
};

export type ComparativoBloco = {
  rotulo: string;
  aviso: string | null;
  linhas: ComparativoLinha[];
};

export type DetalheItem = {
  nome: string;
  grupo: string;
  tipo: string;
  totalCents: number;
  meses: { competencia: string; valorCents: number; origemValor: string }[];
};

export type DetalheGrupo = {
  grupo: string;
  tipo: string;
  totalCents: number;
  itens: DetalheItem[];
};

export type Slide = {
  id: string;
  kicker: string;
  titulo: string;
  linhas: { rotulo: string; valor: string }[];
  nota?: string;
};

export type ConfigBloco = {
  condominio: { nome: string; codigo: string };
  fonte: string[];
  periodos: { origem: string; rotulo: string; qualidade: string }[];
  qualidade: string[];
  importador: string;
  pagamento: string;
  login: string;
};

export type ModuloPayload = {
  modulo: ModuloId;
  titulo: string;
  kicker: string;
  recorte: RecorteId;
  condominio: { nome: string; codigo: string };
  periodo: { rotulo: string; selo: "REALIZADO"; qualidade: string };
  criterio: "COLUNA_B" | "SOMA_MESES_EQUIVALENTES";
  avisos: string[];
  kpis: { id: string; rotulo: string; valorCents: number; extra?: string }[];
  composicao: Fatia[];
  ranking: RankingItem[];
  rankingRotulo: string;
  mostrarOrdem: boolean;
  serie: SeriePonto[];
  serieRotulo: string;
  waterfall: WaterfallStep[];
  destaques: DestaqueCard[];
  comparativos: ComparativoBloco[];
  detalhamento: { competencias: string[]; grupos: DetalheGrupo[] };
  alertas: Alerta[];
  slides: Slide[];
  config: ConfigBloco | null;
  statusDespesa: "Despesa registrada";
  fonte: { arquivos: string[] };
  ordem: OrdemId;
  coberturaCota: CoberturaCotaPayload | null;
  inadimplencia: InadimplenciaPayload | null;
};

function variacao(atual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return (atual - anterior) / anterior;
}

function rotuloGrupo(grupo: string): string {
  const n = grupo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (n.includes("eventual")) return "Eventuais";
  if (n.includes("financeir")) return "Financeiras";
  return grupo;
}

function grupoMatch(grupo: string, trecho: string): boolean {
  return grupo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .includes(trecho);
}

function composicaoRotulada(lista: LancamentoComRel[], tipo: "RECEITA" | "DESPESA"): Fatia[] {
  return composicaoGrupo(lista, tipo).map((f) => ({ ...f, grupo: rotuloGrupo(f.grupo) }));
}

function rankingComDestaque(
  lista: LancamentoComRel[],
  tipo: "RECEITA" | "DESPESA",
  ordem: OrdemId,
  destaque?: string,
  limite?: number,
): RankingItem[] {
  const rows = rankingItens(lista, tipo, ordem).map((r) => ({
    ...r,
    grupo: rotuloGrupo(r.grupo),
    destaque: destaque ? r.nome === destaque : false,
  }));
  return typeof limite === "number" ? rows.slice(0, limite) : rows;
}

function serieCategoria(lista: LancamentoComRel[], periodos: Periodo[], nome: string): SeriePonto[] {
  return periodos.map((p) => {
    const valor = lista
      .filter((l) => l.periodoId === p.id && l.categoria.nome === nome)
      .reduce((a, l) => a + l.valorCents, 0);
    return {
      competencia: p.competencia,
      receitaCents: lista.filter((l) => l.periodoId === p.id && l.tipo === "RECEITA").reduce((a, l) => a + l.valorCents, 0),
      despesaCents: lista.filter((l) => l.periodoId === p.id && l.tipo === "DESPESA").reduce((a, l) => a + l.valorCents, 0),
      resultadoCents: 0,
      saldoCents: p.saldoFinalCents ?? 0,
      valorCents: valor,
      qualidade: p.qualidade,
    };
  });
}

function statsMeses(valores: number[]) {
  const n = valores.filter((v) => v !== 0);
  if (n.length === 0) return { media: 0, maior: 0, menor: 0 };
  return {
    media: Math.round(n.reduce((a, b) => a + b, 0) / n.length),
    maior: Math.max(...n),
    menor: Math.min(...n),
  };
}

function montarDetalhamento(lista: LancamentoComRel[], periodos: Periodo[]) {
  const competencias = periodos.map((p) => p.competencia);
  const map = new Map<string, DetalheGrupo>();
  for (const l of lista) {
    const key = `${l.tipo}::${rotuloGrupo(l.categoria.grupo)}`;
    const grupo = map.get(key) ?? {
      grupo: rotuloGrupo(l.categoria.grupo),
      tipo: l.tipo,
      totalCents: 0,
      itens: [],
    };
    grupo.totalCents += l.valorCents;
    let item = grupo.itens.find((i) => i.nome === l.categoria.nome);
    if (!item) {
      item = { nome: l.categoria.nome, grupo: grupo.grupo, tipo: l.tipo, totalCents: 0, meses: [] };
      grupo.itens.push(item);
    }
    item.totalCents += l.valorCents;
    const mes = item.meses.find((m) => m.competencia === l.periodo.competencia);
    if (mes) {
      mes.valorCents += l.valorCents;
    } else {
      item.meses.push({
        competencia: l.periodo.competencia,
        valorCents: l.valorCents,
        origemValor: l.origemValor,
      });
    }
    map.set(key, grupo);
  }
  const grupos = [...map.values()]
    .map((g) => ({
      ...g,
      itens: g.itens.sort((a, b) => Math.abs(b.totalCents) - Math.abs(a.totalCents)),
    }))
    .sort((a, b) => Math.abs(b.totalCents) - Math.abs(a.totalCents));
  return { competencias, grupos };
}

function avisoPeriodos(recorte: RecorteId): string[] {
  const avisos: string[] = [];
  if (recorte === "oficial-2026") {
    avisos.push(
      "O recorte oficial 2026 cobre Out/2025–Set/2026 (12 competências). O arquivo 2025 cobre Jan–Jul/2025. Comparativo entre anos usa somente Jan–Jul.",
    );
    avisos.push("Set/2026 é REALIZADO parcial e não entra em média de cobertura.");
  }
  if (recorte === "equivalente-jan-jul") {
    avisos.push("Totais deste recorte são soma dos meses Jan–Jul/2026, não a coluna B do período oficial de 12 competências.");
  }
  avisos.push("Status de pagamento não disponível. Rótulo usado: Despesa registrada.");
  return avisos;
}

function emptyBase(
  modulo: ModuloId,
  titulo: string,
  ctx: {
    recorte: RecorteId;
    ordem: OrdemId;
    condominio: { nome: string; codigo: string };
    rotulo: string;
    criterio: "COLUNA_B" | "SOMA_MESES_EQUIVALENTES";
    fonte: string[];
  },
): ModuloPayload {
  return {
    modulo,
    titulo,
    kicker: ctx.condominio.nome,
    recorte: ctx.recorte,
    condominio: ctx.condominio,
    periodo: { rotulo: ctx.rotulo, selo: "REALIZADO", qualidade: ctx.criterio },
    criterio: ctx.criterio,
    avisos: avisoPeriodos(ctx.recorte),
    kpis: [],
    composicao: [],
    ranking: [],
    rankingRotulo: "Ranking",
    mostrarOrdem: false,
    serie: [],
    serieRotulo: "Evolução mensal",
    waterfall: [],
    destaques: [],
    comparativos: [],
    detalhamento: { competencias: [], grupos: [] },
    alertas: [],
    slides: [],
    config: null,
    statusDespesa: "Despesa registrada",
    fonte: { arquivos: ctx.fonte },
    ordem: ctx.ordem,
    coberturaCota: null,
    inadimplencia: null,
  };
}

export function montarModulo(params: {
  modulo: ModuloId;
  recorte: RecorteId;
  ordem: OrdemId;
  condominio: { nome: string; codigo: string };
  totais: TotalOficial[];
  periodos: Periodo[];
  lancamentos: LancamentoComRel[];
}): ModuloPayload {
  const { modulo, recorte, ordem, condominio, totais, periodos, lancamentos } = params;
  const filtrados = lancamentos.filter((l) => noRecorte(l, recorte));
  const periodosR = periodosDoRecorte(periodos, recorte);
  const totaisR = totaisRecorte(recorte, totais, filtrados, periodosR);
  const ctx = {
    recorte,
    ordem,
    condominio,
    rotulo: totaisR.rotulo,
    criterio: totaisR.criterio,
    fonte: totais.map((t) => t.arquivo),
  };
  const rec = filtrados.filter((l) => l.tipo === "RECEITA");
  const des = filtrados.filter((l) => l.tipo === "DESPESA");
  const jj25 = janJul(lancamentos, 2025);
  const jj26 = janJul(lancamentos, 2026);
  const alertas = montarAlertas(lancamentos);

  if (modulo === "receitas") {
    const p = emptyBase(modulo, "Receitas", ctx);
    const ordinarias =
      somaGrupo(rec, "Cotas ordinárias") +
      somaGrupo(rec, "Aluguéis") +
      rec.filter((l) => grupoMatch(l.categoria.grupo, "financeir")).reduce((a, l) => a + l.valorCents, 0);
    const extra = rec.filter((l) => l.categoria.natureza === "TAXA_EXTRA" || grupoMatch(l.categoria.grupo, "taxa extra")).reduce((a, l) => a + l.valorCents, 0);
    const eventuais = rec.filter((l) => grupoMatch(l.categoria.grupo, "eventual")).reduce((a, l) => a + l.valorCents, 0);
    p.kpis = [
      { id: "total", rotulo: "Receitas", valorCents: totaisR.receita, extra: "KPI do recorte (coluna B no período oficial)" },
      { id: "ordinarias", rotulo: "Ordinárias", valorCents: ordinarias, extra: "Cotas, aluguéis e financeiras" },
      { id: "extra", rotulo: "Taxas extras", valorCents: extra },
      { id: "eventuais", rotulo: "Eventuais", valorCents: eventuais },
    ];
    p.composicao = composicaoRotulada(filtrados, "RECEITA");
    p.ranking = rankingComDestaque(filtrados, "RECEITA", ordem, "Cotas de Condomínio");
    p.rankingRotulo = "Composição por item";
    p.mostrarOrdem = true;
    p.serie = serieMensalTipo(filtrados, periodosR, "RECEITA");
    p.serieRotulo = "Evolução das receitas";
    return p;
  }

  if (modulo === "despesas") {
    const p = emptyBase(modulo, "Despesas", ctx);
    const impostos = somaGrupo(des, "Impostos");
    const contratos = somaGrupo(des, "Contratos fixos");
    const manutencao = somaGrupo(des, "Manutenção");
    const tarifas = somaGrupo(des, "Tarifas públicas");
    p.kpis = [
      { id: "total", rotulo: "Despesas registradas", valorCents: totaisR.despesa, extra: "Sem status de pagamento" },
      { id: "contratos", rotulo: "Contratos fixos", valorCents: contratos },
      { id: "manutencao", rotulo: "Manutenção", valorCents: manutencao },
      { id: "impostos", rotulo: "Impostos", valorCents: impostos },
    ];
    p.composicao = composicaoRotulada(filtrados, "DESPESA");
    p.ranking = rankingComDestaque(filtrados, "DESPESA", ordem, "Empresa Terceirizada", ordem === "nome" ? undefined : 10);
    p.rankingRotulo = ordem === "nome" ? "Itens (A–Z)" : "Top 10 despesas";
    p.mostrarOrdem = true;
    p.serie = serieMensalTipo(filtrados, periodosR, "DESPESA");
    p.serieRotulo = "Evolução das despesas registradas";
    p.destaques = [
      { id: "tarifas", rotulo: "Tarifas públicas", valorCents: tarifas, nota: "Água, gás, energia e telefone." },
      { id: "impostos", rotulo: "Impostos", valorCents: impostos, nota: "DARF, ISS e demais contribuições do demonstrativo." },
    ];
    return p;
  }

  if (modulo === "fluxo") {
    const p = emptyBase(modulo, "Fluxo financeiro", ctx);
    p.kpis = [
      { id: "inicial", rotulo: "Saldo inicial", valorCents: totaisR.saldoInicial },
      { id: "receitas", rotulo: "Receitas", valorCents: totaisR.receita },
      { id: "despesas", rotulo: "Despesas registradas", valorCents: totaisR.despesa },
      { id: "final", rotulo: "Saldo gerencial final", valorCents: totaisR.saldoFinal },
    ];
    p.waterfall = [
      { rotulo: "Saldo inicial", valorCents: totaisR.saldoInicial, tipo: "base" },
      { rotulo: "Receitas", valorCents: totaisR.receita, tipo: "positivo" },
      { rotulo: "Despesas registradas", valorCents: totaisR.despesa, tipo: "negativo" },
      { rotulo: "Saldo gerencial final", valorCents: totaisR.saldoFinal, tipo: "total" },
    ];
    p.serie = serieMensalTipo(filtrados, periodosR);
    p.serieRotulo = "Receita, despesa e saldo gerencial por mês";
    p.avisos = [
      ...p.avisos,
      "Saldo inicial é R$ 0,00 (não usa a linha Saldo anterior da planilha).",
      "Saldo gerencial do demonstrativo — não é saldo bancário segregado.",
    ];
    return p;
  }

  if (modulo === "taxa-condominial") {
    const p = emptyBase(modulo, "Taxa condominial", ctx);
    const cotas = somaNome(rec, "Cotas de Condomínio", "RECEITA");
    const totalRec = somaTipo(rec, "RECEITA") || totaisR.receita;
    const serieCotas = serieCategoria(rec, periodosR, "Cotas de Condomínio");
    const stats = statsMeses(serieCotas.map((s) => s.valorCents));
    const cotas25 = somaNome(jj25, "Cotas de Condomínio", "RECEITA");
    const cotas26 = somaNome(jj26, "Cotas de Condomínio", "RECEITA");
    const cobertura = montarCoberturaCota({
      lancamentos: filtrados,
      receitaCents: totaisR.receita,
      despesaCents: totaisR.despesa,
    });
    p.kpis = [
      { id: "cotas", rotulo: "Cotas de condomínio", valorCents: cotas },
      { id: "saiu", rotulo: "Saiu (despesas registradas)", valorCents: cobertura.despesaCents },
      {
        id: "sobrou",
        rotulo: cobertura.sobrouCents >= 0 ? "Sobrou" : "Faltou",
        valorCents: Math.abs(cobertura.sobrouCents),
        extra: cobertura.cobriu ? "Cobriu as despesas" : "Não cobriu só com a cota",
      },
      { id: "media", rotulo: "Média mensal (meses com valor)", valorCents: stats.media },
    ];
    p.coberturaCota = cobertura;
    p.inadimplencia = montarInadimplencia();
    p.destaques = [
      {
        id: "part",
        rotulo: "Participação nas receitas do recorte",
        valorCents: cotas,
        extra: totalRec === 0 ? "—" : formatPct(cotas / totalRec).replace("+", ""),
        nota: "Sobre a soma das receitas lançadas neste recorte.",
      },
    ];
    p.serie = serieCotas;
    p.serieRotulo = "Cotas por competência";
    p.comparativos = [
      {
        rotulo: "Cotas Jan–Jul/2025 vs Jan–Jul/2026",
        aviso: avisoComparativoJanJul(recorte),
        linhas: [
          {
            rotulo: "Cotas de Condomínio",
            cents2025: cotas25,
            cents2026: cotas26,
            variacaoPct: variacao(cotas26, cotas25),
          },
        ],
      },
    ];
    return p;
  }

  if (modulo === "fundo-reserva") {
    const p = emptyBase(modulo, "Fundo de reserva", ctx);
    const arrecadado = somaNome(rec, "Fundo de Reserva", "RECEITA");
    const utilizado = des
      .filter((l) => grupoMatch(l.categoria.grupo, "fundo de reserva"))
      .reduce((a, l) => a + l.valorCents, 0);
    p.kpis = [
      { id: "arrecadado", rotulo: "Arrecadação", valorCents: arrecadado },
      { id: "despesa", rotulo: "Despesa registrada do fundo", valorCents: utilizado },
      {
        id: "saldo",
        rotulo: "Saldo do fundo",
        valorCents: SALDO_FUNDO_RESERVA_CENTS,
        extra: "Valor informado. Movimento do recorte (arrecadação − despesa) permanece visível nos outros cards.",
      },
    ];
    p.avisos = [
      ...p.avisos,
      "Saldo do fundo = valor informado (R$ 191.599,35), constante do sistema. Não é saldo bancário segregado.",
    ];
    p.ranking = rankingComDestaque(
      des.filter((l) => grupoMatch(l.categoria.grupo, "fundo de reserva")),
      "DESPESA",
      ordem,
    );
    p.rankingRotulo = "Despesas do fundo";
    p.mostrarOrdem = true;
    p.serie = serieMensalTipo(
      filtrados.filter(
        (l) => l.categoria.nome === "Fundo de Reserva" || grupoMatch(l.categoria.grupo, "fundo de reserva"),
      ),
      periodosR,
    );
    p.serieRotulo = "Arrecadação e despesa do fundo por mês";
    return p;
  }

  if (modulo === "taxas-extras") {
    const p = emptyBase(modulo, "Taxas extras", ctx);
    const academia = somaNome(rec, "Taxa Extra - Academia", "RECEITA");
    const utilizado = somaNome(des, "Aquisição Equipamentos", "DESPESA");
    const diferenca = academia - utilizado;
    p.kpis = [
      { id: "academia", rotulo: "Academia arrecadada", valorCents: academia },
      { id: "utilizado", rotulo: "Utilizado (Aquisição Equipamentos)", valorCents: utilizado },
      { id: "diff", rotulo: "Diferença gerencial", valorCents: diferenca, extra: "Arrecadado − utilizado neste recorte" },
    ];
    p.avisos = [
      ...p.avisos,
      "Diferença gerencial da taxa extra Academia. Não é saldo bancário da taxa extra.",
    ];
    p.ranking = rankingComDestaque(
      filtrados.filter((l) => l.categoria.natureza === "TAXA_EXTRA" || grupoMatch(l.categoria.grupo, "taxa extra")),
      "DESPESA",
      ordem,
    );
    p.rankingRotulo = "Itens de taxa extra (despesa)";
    p.mostrarOrdem = true;
    p.serie = serieCategoria(rec, periodosR, "Taxa Extra - Academia");
    p.serieRotulo = "Arrecadação da Academia por mês";
    p.destaques = [
      {
        id: "nota",
        rotulo: "Escopo desta tela",
        valorCents: academia,
        nota: "Somente a linha Taxa Extra - Academia versus Aquisição Equipamentos. Outras taxas extras, se existirem, aparecem no ranking de despesa.",
      },
    ];
    return p;
  }

  if (modulo === "contratos") {
    const p = emptyBase(modulo, "Contratos", ctx);
    const contratos = des.filter((l) => grupoMatch(l.categoria.grupo, "contratos fixos"));
    const totalContratos = contratos.reduce((a, l) => a + l.valorCents, 0);
    const terceirizada = somaNome(des, "Empresa Terceirizada", "DESPESA");
    const baseDespesa = totaisR.despesa || somaTipo(des, "DESPESA");
    p.kpis = [
      { id: "contratos", rotulo: "Contratos fixos", valorCents: totalContratos },
      {
        id: "terceirizada",
        rotulo: "Empresa terceirizada",
        valorCents: terceirizada,
        extra: baseDespesa === 0 ? "—" : `${formatPct(terceirizada / baseDespesa).replace("+", "")} da despesa do recorte`,
      },
      {
        id: "concentracao",
        rotulo: "Participação dos contratos",
        valorCents: totalContratos,
        extra: baseDespesa === 0 ? "—" : `${formatPct(totalContratos / baseDespesa).replace("+", "")} da despesa registrada`,
      },
    ];
    p.ranking = rankingComDestaque(contratos, "DESPESA", ordem, "Empresa Terceirizada");
    p.rankingRotulo = "Ranking de contratos";
    p.mostrarOrdem = true;
    p.serie = serieMensalTipo(contratos, periodosR, "DESPESA");
    p.serieRotulo = "Contratos por mês";
    p.destaques = [
      {
        id: "terceirizada",
        rotulo: "Empresa Terceirizada",
        valorCents: terceirizada,
        nota:
          baseDespesa === 0
            ? "Sem despesa no recorte."
            : `Concentração: ${formatPct(terceirizada / baseDespesa).replace("+", "")} das despesas registradas do recorte.`,
      },
    ];
    return p;
  }

  if (modulo === "utilidades") {
    const p = emptyBase(modulo, "Utilidades", ctx);
    const nomes = ["Água e Esgoto", "Gás", "Energia Elétrica", "Energia Solar", "Telefone - Internet"] as const;
    const valores = nomes.map((nome) => ({ nome, valorCents: somaNome(des, nome, "DESPESA") }));
    const total = valores.reduce((a, v) => a + v.valorCents, 0);
    p.kpis = valores.slice(0, 4).map((v) => ({ id: v.nome, rotulo: v.nome, valorCents: v.valorCents }));
    p.destaques = valores.map((v) => ({
      id: v.nome,
      rotulo: v.nome,
      valorCents: v.valorCents,
      extra: total === 0 ? "—" : formatPct(v.valorCents / total).replace("+", ""),
      nota: "Despesa registrada no grupo Tarifas públicas.",
    }));
    p.ranking = valores
      .map((v) => ({
        nome: v.nome,
        grupo: "Tarifas públicas",
        valorCents: v.valorCents,
        participacao: total === 0 ? 0 : v.valorCents / total,
        destaque: v.nome === "Água e Esgoto" || v.nome === "Energia Elétrica" || v.nome === "Gás",
      }))
      .sort((a, b) => (ordem === "nome" ? a.nome.localeCompare(b.nome, "pt-BR") : Math.abs(b.valorCents) - Math.abs(a.valorCents)));
    p.rankingRotulo = "Utilidades do recorte";
    p.mostrarOrdem = true;
    p.serie = serieMensalTipo(
      des.filter((l) => nomes.includes(l.categoria.nome as (typeof nomes)[number])),
      periodosR,
      "DESPESA",
    );
    p.serieRotulo = "Utilidades por mês";
    const consumo = totaisConsumoJanJul(jj25, jj26);
    p.comparativos = [
      montarComparativoConsumo(jj25, jj26, { avisoRecorte: avisoComparativoJanJul(recorte) }),
    ];
    const gasDestaque = p.destaques.find((d) => d.id === "Gás");
    if (gasDestaque) {
      gasDestaque.nota = `Despesa registrada no grupo Tarifas públicas. Média Jan–Jul/2026: ${formatBRL(consumo.gasMedio26)} por unidade (÷ 124).`;
    }
    return p;
  }

  if (modulo === "manutencao") {
    const p = emptyBase(modulo, "Manutenção", ctx);
    const manut = des.filter((l) => grupoMatch(l.categoria.grupo, "manutencao"));
    const total = manut.reduce((a, l) => a + l.valorCents, 0);
    const m25 = jj25.filter((l) => l.tipo === "DESPESA" && grupoMatch(l.categoria.grupo, "manutencao")).reduce((a, l) => a + l.valorCents, 0);
    const m26 = jj26.filter((l) => l.tipo === "DESPESA" && grupoMatch(l.categoria.grupo, "manutencao")).reduce((a, l) => a + l.valorCents, 0);
    p.kpis = [
      { id: "total", rotulo: "Manutenção no recorte", valorCents: total },
      { id: "janjul26", rotulo: "Jan–Jul/2026", valorCents: m26 },
      { id: "janjul25", rotulo: "Jan–Jul/2025", valorCents: m25, extra: variacao(m26, m25) === null ? undefined : formatPct(variacao(m26, m25)!) },
    ];
    p.ranking = rankingComDestaque(manut, "DESPESA", ordem);
    p.rankingRotulo = "Ranking de manutenção";
    p.mostrarOrdem = true;
    p.serie = serieMensalTipo(manut, periodosR, "DESPESA");
    p.serieRotulo = "Evolução da manutenção";
    p.comparativos = [
      {
        rotulo: "Manutenção Jan–Jul/2025 vs Jan–Jul/2026",
        aviso: avisoComparativoJanJul(recorte),
        linhas: [{ rotulo: "Manutenção", cents2025: m25, cents2026: m26, variacaoPct: variacao(m26, m25) }],
      },
    ];
    return p;
  }

  if (modulo === "patrimonio") {
    const p = emptyBase(modulo, "Patrimônio", ctx);
    const bens = des.filter((l) => grupoMatch(l.categoria.grupo, "patrimonio"));
    const total = bens.reduce((a, l) => a + l.valorCents, 0);
    p.kpis = [{ id: "total", rotulo: "Bens patrimoniais (despesa registrada)", valorCents: total }];
    p.ranking = rankingComDestaque(bens, "DESPESA", ordem);
    p.rankingRotulo = "Aquisições e bens";
    p.mostrarOrdem = true;
    p.serie = serieMensalTipo(bens, periodosR, "DESPESA");
    p.serieRotulo = "Patrimônio por mês";
    p.avisos = [...p.avisos, "Valores do grupo Patrimônio do demonstrativo. Não há inventário físico neste ciclo."];
    return p;
  }

  if (modulo === "comparativo") {
    const p = emptyBase(modulo, "Comparativo 2025 × 2026", ctx);
    const rec25 = somaTipo(jj25, "RECEITA");
    const des25 = somaTipo(jj25, "DESPESA");
    const rec26 = somaTipo(jj26, "RECEITA");
    const des26 = somaTipo(jj26, "DESPESA");
    const consumo = totaisConsumoJanJul(jj25, jj26);
    p.kpis = [
      { id: "rec26", rotulo: "Receitas Jan–Jul/2026", valorCents: rec26 },
      { id: "rec25", rotulo: "Receitas Jan–Jul/2025", valorCents: rec25, extra: formatPct(variacao(rec26, rec25) ?? 0) },
      { id: "des26", rotulo: "Despesas Jan–Jul/2026", valorCents: des26 },
      { id: "des25", rotulo: "Despesas Jan–Jul/2025", valorCents: des25, extra: formatPct(variacao(des26, des25) ?? 0) },
    ];
    p.destaques = [
      {
        id: "agua",
        rotulo: "Água e Esgoto Jan–Jul/2026",
        valorCents: consumo.agua26,
        extra: formatPct(variacao(consumo.agua26, consumo.agua25) ?? 0),
        nota: "Despesa registrada no grupo Tarifas públicas.",
      },
      {
        id: "gas",
        rotulo: "Gás Jan–Jul/2026",
        valorCents: consumo.gas26,
        extra: formatPct(variacao(consumo.gas26, consumo.gas25) ?? 0),
        nota: `Média por unidade: ${formatBRL(consumo.gasMedio26)} (÷ 124). Copa/Salão fora da base.`,
      },
      {
        id: "solar",
        rotulo: "Energia Solar Jan–Jul/2026",
        valorCents: consumo.solar26,
        extra: formatPct(variacao(consumo.solar26, consumo.solar25) ?? 0),
        nota: "Despesa registrada no grupo Tarifas públicas.",
      },
    ];
    p.comparativos = [
      {
        rotulo: "Somente períodos equivalentes: Jan–Jul/2025 vs Jan–Jul/2026",
        aviso:
          recorte === "oficial-2026"
            ? "Aviso: o recorte selecionado na barra é Out/2025–Set/2026 (12 competências). Esta tela não compara 12 meses contra 7. Os números abaixo são só Jan–Jul."
            : recorte === "oficial-2025"
              ? "Aviso: o recorte 2025 oficial já é Jan–Jul. O lado 2026 desta tela também usa Jan–Jul, não o período cheio Out/25–Set/26."
              : null,
        linhas: [
          { rotulo: "Receitas", cents2025: rec25, cents2026: rec26, variacaoPct: variacao(rec26, rec25) },
          { rotulo: "Despesas registradas", cents2025: des25, cents2026: des26, variacaoPct: variacao(des26, des25) },
          {
            rotulo: "Resultado",
            cents2025: rec25 - des25,
            cents2026: rec26 - des26,
            variacaoPct: variacao(rec26 - des26, rec25 - des25),
          },
          {
            rotulo: "Cotas de Condomínio",
            cents2025: somaNome(jj25, "Cotas de Condomínio", "RECEITA"),
            cents2026: somaNome(jj26, "Cotas de Condomínio", "RECEITA"),
            variacaoPct: variacao(somaNome(jj26, "Cotas de Condomínio", "RECEITA"), somaNome(jj25, "Cotas de Condomínio", "RECEITA")),
          },
          {
            rotulo: "Empresa Terceirizada",
            cents2025: somaNome(jj25, "Empresa Terceirizada", "DESPESA"),
            cents2026: somaNome(jj26, "Empresa Terceirizada", "DESPESA"),
            variacaoPct: variacao(somaNome(jj26, "Empresa Terceirizada", "DESPESA"), somaNome(jj25, "Empresa Terceirizada", "DESPESA")),
          },
          {
            rotulo: "Manutenção",
            cents2025: jj25.filter((l) => l.tipo === "DESPESA" && grupoMatch(l.categoria.grupo, "manutencao")).reduce((a, l) => a + l.valorCents, 0),
            cents2026: jj26.filter((l) => l.tipo === "DESPESA" && grupoMatch(l.categoria.grupo, "manutencao")).reduce((a, l) => a + l.valorCents, 0),
            variacaoPct: variacao(
              jj26.filter((l) => l.tipo === "DESPESA" && grupoMatch(l.categoria.grupo, "manutencao")).reduce((a, l) => a + l.valorCents, 0),
              jj25.filter((l) => l.tipo === "DESPESA" && grupoMatch(l.categoria.grupo, "manutencao")).reduce((a, l) => a + l.valorCents, 0),
            ),
          },
        ],
      },
      montarComparativoConsumo(jj25, jj26, { incluirConferencia: true }),
    ];
    p.avisos = [
      "Comparativo travado em Jan–Jul versus Jan–Jul. Nunca 7 meses contra 12.",
      ...avisoPeriodos(recorte),
    ];
    return p;
  }

  if (modulo === "analise-mensal") {
    const p = emptyBase(modulo, "Análise mensal", ctx);
    p.serie = serieMensalTipo(filtrados, periodosR);
    p.serieRotulo = "Receita, despesa, resultado e saldo gerencial";
    p.kpis = [
      { id: "receitas", rotulo: "Receitas do recorte", valorCents: totaisR.receita },
      { id: "despesas", rotulo: "Despesas registradas", valorCents: totaisR.despesa },
      { id: "resultado", rotulo: "Resultado", valorCents: totaisR.resultado },
      { id: "saldo", rotulo: "Saldo gerencial final", valorCents: totaisR.saldoFinal },
    ];
    p.detalhamento = {
      competencias: periodosR.map((x) => x.competencia),
      grupos: periodosR.map((per) => {
        const recM = filtrados.filter((l) => l.periodoId === per.id && l.tipo === "RECEITA").reduce((a, l) => a + l.valorCents, 0);
        const desM = filtrados.filter((l) => l.periodoId === per.id && l.tipo === "DESPESA").reduce((a, l) => a + l.valorCents, 0);
        return {
          grupo: mesLabel(per.competencia),
          tipo: per.qualidade,
          totalCents: recM - desM,
          itens: [
            { nome: "Receitas", grupo: mesLabel(per.competencia), tipo: "RECEITA", totalCents: recM, meses: [] },
            { nome: "Despesas registradas", grupo: mesLabel(per.competencia), tipo: "DESPESA", totalCents: desM, meses: [] },
            { nome: "Resultado", grupo: mesLabel(per.competencia), tipo: "RESULTADO", totalCents: recM - desM, meses: [] },
            { nome: "Saldo gerencial", grupo: mesLabel(per.competencia), tipo: "SALDO", totalCents: per.saldoFinalCents ?? 0, meses: [] },
          ],
        };
      }),
    };
    return p;
  }

  if (modulo === "detalhamento") {
    const p = emptyBase(modulo, "Detalhamento", ctx);
    p.detalhamento = montarDetalhamento(filtrados, periodosR);
    p.kpis = [
      { id: "receitas", rotulo: "Receitas (soma dos itens)", valorCents: somaTipo(filtrados, "RECEITA") },
      { id: "despesas", rotulo: "Despesas (soma dos itens)", valorCents: somaTipo(filtrados, "DESPESA") },
    ];
    p.avisos = [
      ...p.avisos,
      recorte === "oficial-2026" || recorte === "oficial-2025"
        ? "A soma dos meses visíveis pode diferir da coluna B se houver residual (†) no primeiro mês sem coluna."
        : "Recorte equivalente: soma dos meses Jan–Jul.",
    ];
    return p;
  }

  if (modulo === "alertas") {
    const p = emptyBase(modulo, "Alertas", ctx);
    p.alertas = alertas;
    p.avisos = [
      "Motor objetivo: variação Jan–Jul, concentração da empresa terceirizada, mês atípico e Set/2026 incompleto. Sem texto subjetivo.",
    ];
    return p;
  }

  if (modulo === "relatorio") {
    const p = emptyBase(modulo, "Relatório da assembleia", ctx);
    const cotas = somaNome(rec, "Cotas de Condomínio", "RECEITA");
    const terceirizada = somaNome(des, "Empresa Terceirizada", "DESPESA");
    const academia = somaNome(rec, "Taxa Extra - Academia", "RECEITA");
    const fundoRec = somaNome(rec, "Fundo de Reserva", "RECEITA");
    const fundoDes = des.filter((l) => grupoMatch(l.categoria.grupo, "fundo de reserva")).reduce((a, l) => a + l.valorCents, 0);
    const rec25 = somaTipo(jj25, "RECEITA");
    const des25 = somaTipo(jj25, "DESPESA");
    const rec26 = somaTipo(jj26, "RECEITA");
    const des26 = somaTipo(jj26, "DESPESA");
    const topDesp = rankingItens(filtrados, "DESPESA", "valor").slice(0, 5);
    const topRec = rankingItens(filtrados, "RECEITA", "valor").slice(0, 5);
    const cobertura = montarCoberturaCota({
      lancamentos: filtrados,
      receitaCents: totaisR.receita,
      despesaCents: totaisR.despesa,
    });
    const inadimplencia = montarInadimplencia();
    p.slides = [
      {
        id: "capa",
        kicker: "Prestação de contas",
        titulo: condominio.nome,
        linhas: [
          { rotulo: "Código", valor: condominio.codigo },
          { rotulo: "Período", valor: totaisR.rotulo },
          { rotulo: "Selo", valor: "REALIZADO" },
          { rotulo: "Critério", valor: totaisR.criterio === "COLUNA_B" ? "Totais da coluna B" : "Soma Jan–Jul" },
        ],
        nota: "Números do demonstrativo importado. Sem texto de opinião.",
      },
      {
        id: "quadro",
        kicker: "Quadro-resumo",
        titulo: "Entradas, saídas e saldo gerencial",
        linhas: [
          { rotulo: "Saldo inicial", valor: formatBRL(totaisR.saldoInicial) },
          { rotulo: "Receitas", valor: formatBRL(totaisR.receita) },
          { rotulo: "Despesas registradas", valor: formatBRL(totaisR.despesa) },
          { rotulo: "Resultado", valor: formatBRL(totaisR.resultado) },
          { rotulo: "Saldo gerencial final", valor: formatBRL(totaisR.saldoFinal) },
        ],
        nota: "Saldo gerencial do demonstrativo — não é saldo bancário.",
      },
      {
        id: "receitas",
        kicker: "Receitas",
        titulo: "De onde veio o recurso",
        linhas: topRec.map((r) => ({ rotulo: r.nome, valor: `${formatBRL(r.valorCents)} · ${formatPct(r.participacao).replace("+", "")}` })),
      },
      {
        id: "despesas",
        kicker: "Despesas registradas",
        titulo: "Onde foi gasto",
        linhas: topDesp.map((r) => ({ rotulo: r.nome, valor: `${formatBRL(r.valorCents)} · ${formatPct(r.participacao).replace("+", "")}` })),
      },
      {
        id: "taxa",
        kicker: "Taxa condominial",
        titulo: "Cotas de condomínio",
        linhas: [
          { rotulo: "Cotas no recorte", valor: formatBRL(cotas) },
          {
            rotulo: "Participação nas receitas lançadas",
            valor: somaTipo(rec, "RECEITA") === 0 ? "—" : formatPct(cotas / somaTipo(rec, "RECEITA")).replace("+", ""),
          },
        ],
      },
      {
        id: "cobertura-cota",
        kicker: "Cobertura",
        titulo: "A cota cobriu as despesas?",
        linhas: [
          { rotulo: "Entrou de cota", valor: formatBRL(cobertura.cotasCents) },
          { rotulo: "Saldo de entrada", valor: formatBRL(cobertura.saldoEntradaCents) },
          { rotulo: "Disponível (cota + saldo)", valor: formatBRL(cobertura.disponivelCents) },
          { rotulo: "Saiu (despesas registradas)", valor: formatBRL(cobertura.despesaCents) },
          {
            rotulo: cobertura.sobrouCents >= 0 ? "Sobrou" : "Faltou",
            valor: formatBRL(Math.abs(cobertura.sobrouCents)),
          },
          { rotulo: "Outras receitas do recorte", valor: formatBRL(cobertura.outrasReceitasCents) },
          { rotulo: "Resultado geral (todas as receitas − despesas)", valor: formatBRL(cobertura.resultadoGeralCents) },
        ],
        nota: cobertura.cobriu
          ? "A cota e o saldo de entrada cobriram as despesas registradas do recorte."
          : "A cota sozinha não cobriu todas as despesas. Outras receitas (aluguéis, fundo, taxas extras, eventuais) entram no resultado geral.",
      },
      {
        id: "inadimplencia",
        kicker: "Inadimplência",
        titulo: "Saldo em atraso informado",
        linhas: [
          { rotulo: "Período", valor: inadimplencia.rotuloPeriodo },
          {
            rotulo: `Último mês (${inadimplencia.ultimo.rotulo})`,
            valor: `${formatBRL(inadimplencia.ultimo.valorCents)} · ${formatPercentualBp(inadimplencia.ultimo.percentualBp)}`,
          },
          {
            rotulo: `Maior saldo (${inadimplencia.pico.rotulo})`,
            valor: `${formatBRL(inadimplencia.pico.valorCents)} · ${formatPercentualBp(inadimplencia.pico.percentualBp)}`,
          },
          { rotulo: "Média 12 meses", valor: formatPercentualBp(inadimplencia.mediaPercentualBp) },
        ],
        nota: inadimplencia.nota,
      },
      {
        id: "fundo",
        kicker: "Fundo de reserva",
        titulo: "Arrecadação, despesa e saldo do fundo",
        linhas: [
          { rotulo: "Arrecadação", valor: formatBRL(fundoRec) },
          { rotulo: "Despesa registrada", valor: formatBRL(fundoDes) },
          { rotulo: "Saldo do fundo", valor: formatBRL(SALDO_FUNDO_RESERVA_CENTS) },
        ],
        nota: "Saldo informado (R$ 191.599,35). Não é saldo bancário do fundo.",
      },
      {
        id: "academia",
        kicker: "Taxa extra",
        titulo: "Academia",
        linhas: [
          { rotulo: "Arrecadado", valor: formatBRL(academia) },
          { rotulo: "Utilizado (Aquisição Equipamentos)", valor: formatBRL(somaNome(des, "Aquisição Equipamentos", "DESPESA")) },
          {
            rotulo: "Diferença gerencial",
            valor: formatBRL(academia - somaNome(des, "Aquisição Equipamentos", "DESPESA")),
          },
        ],
        nota: "Não é saldo bancário da taxa extra.",
      },
      {
        id: "contratos",
        kicker: "Contratos",
        titulo: "Empresa terceirizada",
        linhas: [
          { rotulo: "Empresa Terceirizada", valor: formatBRL(terceirizada) },
          {
            rotulo: "Participação na despesa do recorte",
            valor: totaisR.despesa === 0 ? "—" : formatPct(terceirizada / totaisR.despesa).replace("+", ""),
          },
        ],
      },
      {
        id: "comparativo",
        kicker: "Comparativo",
        titulo: "Jan–Jul/2025 × Jan–Jul/2026",
        linhas: [
          { rotulo: "Receitas 2025", valor: formatBRL(rec25) },
          { rotulo: "Receitas 2026", valor: formatBRL(rec26) },
          { rotulo: "Despesas 2025", valor: formatBRL(des25) },
          { rotulo: "Despesas 2026", valor: formatBRL(des26) },
        ],
        nota:
          recorte === "oficial-2026"
            ? "O período oficial 2026 tem 12 competências. Este slide usa só Jan–Jul."
            : "Meses equivalentes.",
      },
      {
        id: "alertas",
        kicker: "Qualidade e atenção",
        titulo: "Pontos objetivos",
        linhas: (alertas.length === 0 ? [{ id: "ok", nivel: "aviso" as const, texto: "Nenhum alerta objetivo neste recorte." }] : alertas).map(
          (a) => ({ rotulo: a.nivel === "atencao" ? "Atenção" : "Aviso", valor: a.texto }),
        ),
        nota: "Set/2026 incompleto quando houver receita sem despesa. Sem status Pago.",
      },
      {
        id: "fonte",
        kicker: "Origem",
        titulo: "Fonte dos números",
        linhas: totais.map((t) => ({ rotulo: t.origem === "PLANILHA_2026" ? "2026" : "2025", valor: t.arquivo })),
        nota: "Importação via npm run importar. Status de pagamento não disponível.",
      },
    ];
    p.kpis = [
      { id: "saldo", rotulo: "Saldo gerencial final", valorCents: totaisR.saldoFinal },
      { id: "resultado", rotulo: "Resultado", valorCents: totaisR.resultado },
    ];
    return p;
  }

  const p = emptyBase("configuracoes", "Configurações", ctx);
  p.config = {
    condominio: condominio,
    fonte: totais.map((t) => t.arquivo),
    periodos: totais.map((t) => ({ origem: t.origem, rotulo: t.rotulo, qualidade: t.qualidade })),
    qualidade: [
      "Totais oficiais = coluna B da planilha.",
      "Out/2025 e Jan/2025 são residuais reconstruídos (RESIDUAL_MES_AUSENTE).",
      "Set/2026 = REALIZADO parcial.",
      "Status de pagamento não disponível.",
    ],
    importador: "Para atualizar os dados, rode npm run importar no terminal. Não há importador nesta tela.",
    pagamento: "Status de pagamento não disponível. Rótulo usado em todo o sistema: Despesa registrada.",
    login: "Não há login nem papéis neste ciclo. A API usa o condomínio do ambiente (CONDOMINIO_CODIGO).",
  };
  return p;
}
