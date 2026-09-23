"use client";

import { useCallback, useEffect, useState } from "react";

type Item = {
  id: string;
  nome: string;
  status: string;
  comentario: string | null;
  exigeFoto: boolean;
  questionamento: string | null;
};
type Evidencia = { id: string; itemId: string | null };
type Checklist = {
  id: string;
  status: string;
  modelo: { nome: string; departamento: string; exigeJustificativa: boolean; exigeFoto: boolean };
  responsavel: { nome: string } | null;
  itens: Item[];
  evidencias: Evidencia[];
};

function hojeIso() {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

function selo(status: string) {
  if (status === "PENDING") return "bg-warning-soft text-warning";
  if (status === "COMPLETED") return "bg-forest-soft text-forest";
  if (status === "CANCELLED") return "bg-danger-soft text-danger";
  return "bg-forest-soft text-forest";
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(json.error?.message || "Não foi possível concluir.");
  return json.data as T;
}

export function PaginaChecklists({ admin }: { admin: boolean }) {
  const [data, setData] = useState(hojeIso);
  const [departamento, setDepartamento] = useState("");
  const [lista, setLista] = useState<Checklist[]>([]);
  const [aberto, setAberto] = useState<Checklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [obs, setObs] = useState<Record<string, string>>({});
  const [pergunta, setPergunta] = useState<Record<string, string>>({});

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const params = new URLSearchParams({ data });
      if (departamento) params.set("departamento", departamento);
      const linhas = await api<Checklist[]>(`/api/operacao/checklists?${params}`);
      setLista(linhas);
      setAberto((atual) => (atual ? linhas.find((item) => item.id === atual.id) || null : null));
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível carregar.");
    } finally {
      setLoading(false);
    }
  }, [data, departamento]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function patchChecklist(id: string, corpo: Record<string, unknown>) {
    setErro("");
    try {
      const atualizado = await api<Checklist>(`/api/operacao/checklists/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      setAberto(atualizado);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível concluir.");
    }
  }

  async function patchItem(checklistId: string, itemId: string, corpo: Record<string, unknown>) {
    setErro("");
    try {
      const atualizado = await api<Checklist>(`/api/operacao/checklists/${checklistId}/itens/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      setAberto(atualizado);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar o item.");
    }
  }

  async function enviarFoto(checklistId: string, itemId: string, arquivo: File) {
    const form = new FormData();
    form.set("foto", arquivo);
    form.set("itemId", itemId);
    setErro("");
    try {
      await api(`/api/operacao/checklists/${checklistId}/evidencias`, { method: "POST", body: form });
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível enviar a foto.");
    }
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Operação</p>
      <h1 className="page-title">Acompanhar checklists</h1>
      {erro ? <p className="mt-4 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">{erro}</p> : null}
      <form className="mt-4 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); void carregar(); }}>
        <input type="date" className="min-h-11 rounded-2xl border border-line bg-surface px-3 text-sm" value={data} onChange={(e) => setData(e.target.value)} aria-label="Data" />
        <select className="min-h-11 rounded-2xl border border-line bg-surface px-3 text-sm" value={departamento} onChange={(e) => setDepartamento(e.target.value)} aria-label="Departamento">
          <option value="">Departamento</option>
          <option value="ZELADORIA">Zeladoria</option>
          <option value="LIMPEZA">Limpeza</option>
        </select>
        <button type="submit" className="min-h-11 rounded-full bg-forest px-4 text-sm font-semibold text-white">Filtrar</button>
        <button type="button" className="min-h-11 rounded-full border border-line px-4 text-sm" onClick={() => { setData(hojeIso()); setDepartamento(""); }}>Hoje</button>
      </form>
      {loading ? <div className="mt-4 h-40 animate-pulse rounded-[var(--radius-card)] bg-surface" /> : null}
      {!loading && lista.length === 0 ? (
        <p className="mt-4 rounded-[var(--radius-card)] border border-card-line bg-surface px-4 py-10 text-center text-sm text-muted">Nenhum checklist nesta data.</p>
      ) : null}
      <ul className="mt-4 space-y-3">
        {lista.map((item) => {
          const feitos = item.itens.filter((linha) => linha.status !== "PENDING").length;
          return (
            <li key={item.id}>
              <button type="button" className="w-full rounded-[var(--radius-card)] border border-card-line bg-surface p-4 text-left" onClick={() => setAberto(item)}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{item.modelo.nome}</p>
                    <p className="text-sm text-muted">{item.responsavel?.nome || "Sem responsável"} · {feitos}/{item.itens.length} itens</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${selo(item.status)}`}>{item.status === "PENDING" ? "Pendente" : item.status === "IN_PROGRESS" ? "Em execução" : item.status === "COMPLETED" ? "Concluído" : item.status}</span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {aberto ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink/40">
          <div className="h-full w-full max-w-lg overflow-y-auto bg-page p-4 sm:p-6">
            <button type="button" className="min-h-11 text-sm font-medium text-forest" onClick={() => setAberto(null)}>Voltar</button>
            <h2 className="page-title">{aberto.modelo.nome}</h2>
            <p className="text-sm text-muted">{aberto.responsavel?.nome || "Sem responsável"}</p>
            {admin && aberto.status === "PENDING" ? (
              <button type="button" className="mt-3 min-h-11 rounded-full bg-forest px-4 text-sm font-semibold text-white" onClick={() => void patchChecklist(aberto.id, { acao: "iniciar" })}>Iniciar</button>
            ) : null}
            <ul className="mt-4 space-y-4">
              {aberto.itens.map((item) => (
                <li key={item.id} className="rounded-[var(--radius-card)] border border-card-line bg-surface p-3">
                  <p className="font-medium">{item.nome}</p>
                  {admin && aberto.status === "IN_PROGRESS" ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" className="min-h-11 rounded-full bg-forest px-3 text-sm font-semibold text-white" onClick={() => void patchItem(aberto.id, item.id, { status: "DONE", comentario: obs[item.id] ?? item.comentario ?? "" })}>Feito</button>
                      <button type="button" className="min-h-11 rounded-full border border-line px-3 text-sm" onClick={() => void patchItem(aberto.id, item.id, { status: "NOT_DONE", comentario: obs[item.id] ?? item.comentario ?? "" })}>Não feito</button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted">{item.status === "DONE" ? "Feito" : item.status === "NOT_DONE" ? "Não feito" : "Pendente"}</p>
                  )}
                  <label className="mt-2 block text-sm" htmlFor={`obs-${item.id}`}>Observação</label>
                  <textarea id={`obs-${item.id}`} className="mt-1 min-h-16 w-full rounded-2xl border border-line bg-page p-2 text-sm" value={obs[item.id] ?? item.comentario ?? ""} onChange={(e) => setObs({ ...obs, [item.id]: e.target.value })} disabled={!admin || aberto.status !== "IN_PROGRESS"} />
                  {admin && aberto.status === "IN_PROGRESS" ? (
                    <button type="button" className="mt-2 min-h-11 rounded-full border border-line px-3 text-sm" onClick={() => void patchItem(aberto.id, item.id, { status: item.status, comentario: obs[item.id] ?? "" })}>Salvar observação</button>
                  ) : null}
                  {(item.exigeFoto || aberto.modelo.exigeFoto) && admin && aberto.status === "IN_PROGRESS" ? (
                    <label className="mt-2 block text-sm font-medium text-forest">
                      Enviar foto
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block text-sm" onChange={(e) => {
                        const arquivo = e.target.files?.[0];
                        if (arquivo) void enviarFoto(aberto.id, item.id, arquivo);
                      }} />
                    </label>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {aberto.evidencias.filter((foto) => foto.itemId === item.id).map((foto) => (
                      <a key={foto.id} href={`/api/operacao/evidencias/${foto.id}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-forest">Abrir foto</a>
                    ))}
                  </div>
                  {item.questionamento ? <p className="mt-2 text-sm">Questionamento: {item.questionamento}</p> : null}
                  {admin && item.status === "NOT_DONE" ? (
                    <div className="mt-2">
                      <label className="text-sm" htmlFor={`q-${item.id}`}>Questionar</label>
                      <textarea id={`q-${item.id}`} className="mt-1 min-h-16 w-full rounded-2xl border border-line bg-page p-2 text-sm" value={pergunta[item.id] || ""} onChange={(e) => setPergunta({ ...pergunta, [item.id]: e.target.value })} />
                      <button type="button" className="mt-2 min-h-11 rounded-full border border-line px-3 text-sm font-medium text-forest" onClick={() => void patchChecklist(aberto.id, { acao: "questionar", itemId: item.id, texto: pergunta[item.id] || "" })}>Questionar</button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
            {admin && aberto.status === "IN_PROGRESS" ? (
              <button type="button" className="mt-4 min-h-11 w-full rounded-full bg-forest text-sm font-semibold text-white" onClick={() => void patchChecklist(aberto.id, { acao: "finalizar" })}>Finalizar</button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
