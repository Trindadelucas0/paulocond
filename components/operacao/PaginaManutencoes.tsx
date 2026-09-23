"use client";

import { useCallback, useEffect, useState } from "react";
import { centsParaReais } from "@/lib/operacao/regras";

type Pessoa = { id: string; nome: string; email?: string };
type Manutencao = {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string;
  local: string | null;
  prioridade: string;
  dataPrevista: string | null;
  status: string;
  notasConclusao: string | null;
  custoCents: number | null;
  responsavelNome: string | null;
  responsavel: Pessoa | null;
  criadoPor: { id: string; nome: string } | null;
};

type Resumo = {
  total: number;
  pendente: number;
  emAndamento: number;
  concluida: number;
  cancelada: number;
  preventiva: number;
  corretiva: number;
  porResponsavel: { nome: string; total: number }[];
};

const VAZIO = {
  titulo: "",
  descricao: "",
  tipo: "CORRETIVA",
  prioridade: "NORMAL",
  local: "",
  dataPrevista: "",
  responsavelId: "",
  responsavelNomeOrigem: "",
  custo: "",
};

function nomeResponsavel(item: Manutencao) {
  return item.responsavel?.nome || item.responsavelNome || "Sem responsável";
}

function selo(status: string) {
  if (status === "pendente") return "bg-warning-soft text-warning";
  if (status === "cancelada") return "bg-danger-soft text-danger";
  return "bg-forest-soft text-forest";
}

function rotuloStatus(status: string) {
  if (status === "em_andamento") return "Em andamento";
  if (status === "concluida") return "Concluída";
  if (status === "cancelada") return "Cancelada";
  return "Pendente";
}

function dataCurta(valor: string | null) {
  if (!valor) return "Sem data";
  const dia = valor.slice(0, 10);
  const [ano, mes, d] = dia.split("-");
  return `${d}/${mes}/${ano}`;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.error?.message || "Não foi possível concluir.");
  }
  return json.data as T;
}

export function PaginaManutencoes({ admin }: { admin: boolean }) {
  const [itens, setItens] = useState<Manutencao[]>([]);
  const [pagina, setPagina] = useState(1);
  const [paginas, setPaginas] = useState(1);
  const [total, setTotal] = useState(0);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [tipo, setTipo] = useState("");
  const [status, setStatus] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [form, setForm] = useState<typeof VAZIO | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [ficha, setFicha] = useState<Manutencao | null>(null);
  const [notas, setNotas] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [baixando, setBaixando] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const params = new URLSearchParams({ pagina: String(pagina) });
      if (tipo) params.set("tipo", tipo);
      if (status) params.set("status", status);
      if (responsavel) params.set("responsavel", responsavel);
      if (busca.trim()) params.set("busca", busca.trim());
      const data = await api<{ itens: Manutencao[]; paginas: number; total: number; resumo: Resumo }>(
        `/api/operacao/manutencoes?${params}`,
      );
      setItens(data.itens);
      setPaginas(data.paginas);
      setTotal(data.total);
      setResumo(data.resumo);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível carregar.");
    } finally {
      setLoading(false);
    }
  }, [pagina, tipo, status, responsavel, busca]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (!admin) return;
    void api<Pessoa[]>("/api/operacao/usuarios").then(setPessoas).catch(() => setPessoas([]));
  }, [admin]);

  async function baixar(formato: "xlsx" | "pdf") {
    setBaixando(formato);
    setErro("");
    try {
      const params = new URLSearchParams({ formato });
      if (tipo) params.set("tipo", tipo);
      if (status) params.set("status", status);
      if (responsavel) params.set("responsavel", responsavel);
      if (busca.trim()) params.set("busca", busca.trim());
      const res = await fetch(`/api/operacao/manutencoes/exportar?${params}`, { credentials: "same-origin" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error?.message || "Não foi possível exportar.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dia = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `manutencoes-${dia}.${formato === "pdf" ? "pdf" : "xlsx"}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível exportar.");
    } finally {
      setBaixando("");
    }
  }

  function aberta(statusAtual: string) {
    return statusAtual === "pendente" || statusAtual === "em_andamento";
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setEnviando(true);
    setErro("");
    try {
      const payload = {
        titulo: form.titulo,
        descricao: form.descricao,
        tipo: form.tipo,
        prioridade: form.prioridade,
        local: form.local,
        dataPrevista: form.dataPrevista || null,
        custo: form.custo || null,
        acao: "editar",
        ...(form.responsavelId === "origem" ? {} : { responsavelId: form.responsavelId || null }),
      };
      if (editId) {
        await api(`/api/operacao/manutencoes/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await api("/api/operacao/manutencoes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setForm(null);
      setEditId(null);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setEnviando(false);
    }
  }

  async function acao(id: string, corpo: Record<string, unknown>) {
    setErro("");
    const data = await api<Manutencao>(`/api/operacao/manutencoes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
    setFicha(data);
    await carregar();
  }

  async function excluir(id: string) {
    if (!window.confirm("Excluir esta manutenção?")) return;
    setErro("");
    try {
      await api(`/api/operacao/manutencoes/${id}`, { method: "DELETE" });
      if (ficha?.id === id) setFicha(null);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível excluir.");
    }
  }

  function editar(item: Manutencao) {
    setEditId(item.id);
    setForm({
      titulo: item.titulo,
      descricao: item.descricao,
      tipo: item.tipo,
      prioridade: item.prioridade,
      local: item.local || "",
      dataPrevista: item.dataPrevista ? item.dataPrevista.slice(0, 10) : "",
      responsavelId: item.responsavel?.id || (item.responsavelNome ? "origem" : ""),
      responsavelNomeOrigem: item.responsavelNome || "",
      custo: item.custoCents != null ? (item.custoCents / 100).toFixed(2) : "",
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Operação</p>
          <h1 className="page-title">Manutenções</h1>
          <p className="mt-1 text-sm text-muted">{resumo?.total ?? total} no condomínio. A despesa da planilha continua em Manutenção.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="min-h-11 rounded-full border border-line bg-surface px-4 text-sm font-medium" disabled={baixando !== ""} onClick={() => void baixar("xlsx")}>
            {baixando === "xlsx" ? "Gerando…" : "Excel"}
          </button>
          <button type="button" className="min-h-11 rounded-full border border-line bg-surface px-4 text-sm font-medium" disabled={baixando !== ""} onClick={() => void baixar("pdf")}>
            {baixando === "pdf" ? "Gerando…" : "PDF"}
          </button>
          {admin ? (
            <button
              type="button"
              className="min-h-11 rounded-full bg-forest px-4 text-sm font-semibold text-white"
              onClick={() => {
                setEditId(null);
                setForm({ ...VAZIO });
              }}
            >
              Nova manutenção
            </button>
          ) : null}
        </div>
      </div>

      {resumo ? (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { rotulo: "Total", valor: resumo.total, status: "", tipo: "" },
              { rotulo: "Pendentes", valor: resumo.pendente, status: "pendente", tipo: "" },
              { rotulo: "Em andamento", valor: resumo.emAndamento, status: "em_andamento", tipo: "" },
              { rotulo: "Preventivas", valor: resumo.preventiva, status: "", tipo: "PREVENTIVA" },
              { rotulo: "Corretivas", valor: resumo.corretiva, status: "", tipo: "CORRETIVA" },
            ].map((card) => {
              const ativo = card.rotulo === "Total" ? !status && !tipo && !responsavel : card.status ? status === card.status : tipo === card.tipo;
              return (
                <button
                  key={card.rotulo}
                  type="button"
                  className={`rounded-[var(--radius-card)] border px-3 py-3 text-left ${ativo ? "border-forest bg-forest-soft" : "border-card-line bg-surface"}`}
                  onClick={() => {
                    setPagina(1);
                    setStatus(card.status);
                    setTipo(card.tipo);
                    if (card.rotulo === "Total") setResponsavel("");
                  }}
                >
                  <p className="text-2xl font-bold text-ink">{card.valor}</p>
                  <p className="text-sm text-muted">{card.rotulo}</p>
                </button>
              );
            })}
          </div>
          <div className="rounded-[var(--radius-card)] border border-card-line bg-surface p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Atribuídas a</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {resumo.porResponsavel.map((pessoa) => {
                const ativo = responsavel === pessoa.nome;
                return (
                  <button
                    key={pessoa.nome}
                    type="button"
                    className={`min-h-11 rounded-full px-3 text-sm font-medium ${ativo ? "bg-forest text-white" : "border border-line bg-page text-ink"}`}
                    onClick={() => {
                      setPagina(1);
                      setResponsavel(ativo ? "" : pessoa.nome);
                    }}
                  >
                    {pessoa.nome} · {pessoa.total}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {erro ? (
        <p className="mt-4 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
          {erro}
        </p>
      ) : null}

      <form
        className="mt-4 grid gap-2 rounded-[var(--radius-card)] border border-card-line bg-surface p-3 sm:grid-cols-[1fr_1fr_1.4fr_auto_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          setPagina(1);
          void carregar();
        }}
      >
        <select className="min-h-11 rounded-2xl border border-line bg-page px-3 text-sm" value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo">
          <option value="">Tipo</option>
          <option value="CORRETIVA">Corretiva</option>
          <option value="PREVENTIVA">Preventiva</option>
        </select>
        <select className="min-h-11 rounded-2xl border border-line bg-page px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">Status</option>
          <option value="pendente">Pendente</option>
          <option value="em_andamento">Em andamento</option>
          <option value="concluida">Concluída</option>
          <option value="cancelada">Cancelada</option>
        </select>
        <input className="min-h-11 rounded-2xl border border-line bg-page px-3 text-sm" placeholder="Busca" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Busca" />
        <button type="submit" className="min-h-11 rounded-full bg-forest px-4 text-sm font-semibold text-white">Filtrar</button>
        <button
          type="button"
          className="min-h-11 rounded-full border border-line px-4 text-sm font-medium"
          onClick={() => {
            setTipo("");
            setStatus("");
            setResponsavel("");
            setBusca("");
            setPagina(1);
          }}
        >
          Limpar
        </button>
      </form>

      {loading ? <div className="mt-4 h-40 animate-pulse rounded-[var(--radius-card)] bg-surface" /> : null}

      {!loading && itens.length === 0 ? (
        <div className="mt-4 rounded-[var(--radius-card)] border border-card-line bg-surface px-4 py-10 text-center text-sm text-muted">
          Nenhuma manutenção neste filtro.
        </div>
      ) : null}

      <ul className="mt-4 space-y-3">
        {itens.map((item) => (
          <li key={item.id} className="rounded-[var(--radius-card)] border border-card-line bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-ink">{item.titulo}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{item.descricao}</p>
                <p className="mt-2 text-sm text-ink">
                  {item.tipo === "CORRETIVA" ? "Corretiva" : "Preventiva"} · {rotuloStatus(item.status)} · {nomeResponsavel(item)} · {dataCurta(item.dataPrevista)}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${selo(item.status)}`}>{rotuloStatus(item.status)}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="min-h-11 rounded-full border border-line px-3 text-sm font-medium text-forest" onClick={() => { setFicha(item); setNotas(item.notasConclusao || ""); }}>Ver</button>
              {admin && aberta(item.status) ? (
                <>
                  <button type="button" className="min-h-11 rounded-full border border-line px-3 text-sm font-medium" onClick={() => editar(item)}>Editar</button>
                  <button type="button" className="min-h-11 rounded-full border border-danger px-3 text-sm font-medium text-danger" onClick={() => void excluir(item.id)}>Excluir</button>
                  {item.status === "pendente" ? (
                    <button type="button" className="min-h-11 rounded-full bg-forest px-3 text-sm font-semibold text-white" onClick={() => void acao(item.id, { acao: "iniciar" }).catch((e) => setErro(e.message))}>Iniciar</button>
                  ) : null}
                  {item.status === "em_andamento" ? (
                    <button type="button" className="min-h-11 rounded-full bg-forest px-3 text-sm font-semibold text-white" onClick={() => { setFicha(item); setNotas(""); }}>Dar baixa</button>
                  ) : null}
                  <button type="button" className="min-h-11 rounded-full border border-danger px-3 text-sm font-medium text-danger" onClick={() => void acao(item.id, { acao: "cancelar" }).catch((e) => setErro(e.message))}>Cancelar</button>
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {paginas > 1 ? (
        <div className="mt-4 flex items-center gap-2">
          <button type="button" className="min-h-11 rounded-full border border-line px-3 text-sm" disabled={pagina <= 1} onClick={() => setPagina((n) => n - 1)}>Anterior</button>
          <span className="text-sm text-muted">{pagina} / {paginas}</span>
          <button type="button" className="min-h-11 rounded-full border border-line px-3 text-sm" disabled={pagina >= paginas} onClick={() => setPagina((n) => n + 1)}>Próxima</button>
        </div>
      ) : null}

      {ficha ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink/40">
          <div className="h-full w-full max-w-lg overflow-y-auto bg-page p-4 sm:p-6">
            <button type="button" className="min-h-11 text-sm font-medium text-forest" onClick={() => setFicha(null)}>Voltar</button>
            <h2 className="page-title">{ficha.titulo}</h2>
            <p className="mt-2 text-sm text-muted">{ficha.descricao}</p>
            <p className="mt-3 text-sm">Local: {ficha.local || "—"}</p>
            <p className="text-sm">Data: {dataCurta(ficha.dataPrevista)}</p>
            <p className="text-sm">Prioridade: {ficha.prioridade}</p>
            <p className="text-sm">Responsável: {nomeResponsavel(ficha)}</p>
            <p className="text-sm">Custo: {ficha.custoCents != null ? `R$ ${centsParaReais(ficha.custoCents)}` : "—"}</p>
            <p className="mt-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${selo(ficha.status)}`}>{rotuloStatus(ficha.status)}</span></p>
            {admin && aberta(ficha.status) ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="min-h-11 rounded-full border border-line px-3 text-sm font-medium" onClick={() => editar(ficha)}>Editar</button>
                <button type="button" className="min-h-11 rounded-full border border-danger px-3 text-sm font-medium text-danger" onClick={() => void excluir(ficha.id)}>Excluir</button>
                {ficha.status === "pendente" ? (
                  <button type="button" className="min-h-11 rounded-full bg-forest px-3 text-sm font-semibold text-white" onClick={() => void acao(ficha.id, { acao: "iniciar" }).catch((e) => setErro(e.message))}>Iniciar</button>
                ) : null}
                <button type="button" className="min-h-11 rounded-full border border-danger px-3 text-sm font-medium text-danger" onClick={() => void acao(ficha.id, { acao: "cancelar" }).catch((e) => setErro(e.message))}>Cancelar</button>
              </div>
            ) : null}
            {admin && ficha.status === "em_andamento" ? (
              <form
                className="mt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void acao(ficha.id, { acao: "dar_baixa", notas }).catch((err) => setErro(err.message));
                }}
              >
                <label className="text-sm font-medium" htmlFor="notas-baixa">Notas de conclusão</label>
                <textarea id="notas-baixa" className="mt-1 min-h-24 w-full rounded-2xl border border-line bg-surface p-3 text-sm" value={notas} onChange={(e) => setNotas(e.target.value)} />
                <button type="submit" className="mt-2 min-h-11 rounded-full bg-forest px-4 text-sm font-semibold text-white">Confirmar baixa</button>
              </form>
            ) : null}
            {ficha.notasConclusao ? <p className="mt-3 text-sm">Notas: {ficha.notasConclusao}</p> : null}
          </div>
        </div>
      ) : null}

      {form ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center">
          <form onSubmit={salvar} className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[var(--radius-card)] bg-surface p-5 sm:rounded-[var(--radius-card)]">
            <h2 className="text-lg font-bold">{editId ? "Editar manutenção" : "Nova manutenção"}</h2>
            <label className="mt-3 block text-sm font-medium" htmlFor="titulo">Título</label>
            <input id="titulo" required className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-page px-3 text-sm" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            <label className="mt-3 block text-sm font-medium" htmlFor="descricao">Descrição</label>
            <textarea id="descricao" required className="mt-1 min-h-24 w-full rounded-2xl border border-line bg-page p-3 text-sm" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium">Tipo
                <select className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-page px-3 text-sm" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                  <option value="CORRETIVA">Corretiva</option>
                  <option value="PREVENTIVA">Preventiva</option>
                </select>
              </label>
              <label className="text-sm font-medium">Prioridade
                <select className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-page px-3 text-sm" value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: e.target.value })}>
                  <option value="BAIXA">Baixa</option>
                  <option value="NORMAL">Normal</option>
                  <option value="ALTA">Alta</option>
                  <option value="URGENTE">Urgente</option>
                </select>
              </label>
            </div>
            <label className="mt-3 block text-sm font-medium" htmlFor="local">Local</label>
            <input id="local" className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-page px-3 text-sm" value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} />
            <label className="mt-3 block text-sm font-medium" htmlFor="data">Data prevista</label>
            <input id="data" type="date" className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-page px-3 text-sm" value={form.dataPrevista} onChange={(e) => setForm({ ...form, dataPrevista: e.target.value })} />
            <label className="mt-3 block text-sm font-medium" htmlFor="resp">Responsável</label>
            <select id="resp" className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-page px-3 text-sm" value={form.responsavelId} onChange={(e) => setForm({ ...form, responsavelId: e.target.value })}>
              <option value="">Sem responsável</option>
              {form.responsavelNomeOrigem ? <option value="origem">{form.responsavelNomeOrigem}</option> : null}
              {pessoas.map((pessoa) => (
                <option key={pessoa.id} value={pessoa.id}>{pessoa.nome}</option>
              ))}
            </select>
            <label className="mt-3 block text-sm font-medium" htmlFor="custo">Custo (R$)</label>
            <input id="custo" inputMode="decimal" className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-page px-3 text-sm" value={form.custo} onChange={(e) => setForm({ ...form, custo: e.target.value })} />
            <div className="mt-5 flex gap-2">
              <button type="button" className="min-h-11 flex-1 rounded-full border border-line" onClick={() => { setForm(null); setEditId(null); }}>Voltar</button>
              <button type="submit" disabled={enviando} className="min-h-11 flex-1 rounded-full bg-forest font-semibold text-white disabled:opacity-60">{enviando ? "Salvando…" : "Salvar"}</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
