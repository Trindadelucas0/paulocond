"use client";

import { useEffect, useState } from "react";

type Pessoa = { id: string; nome: string };
type Item = { nome: string; exigeFoto: boolean };
type Modelo = {
  id: string;
  nome: string;
  descricao: string | null;
  departamento: string;
  diasSemana: number[];
  ativo: boolean;
  exigeFoto: boolean;
  exigeJustificativa: boolean;
  itens: { id: string; nome: string; exigeFoto: boolean }[];
  atribuicoes: { usuario: Pessoa }[];
};

const DIAS = ["D", "S", "T", "Q", "Q", "S", "S"];
const VAZIO = {
  nome: "",
  descricao: "",
  departamento: "ZELADORIA",
  diasSemana: [1, 2, 3, 4, 5] as number[],
  exigeFoto: true,
  exigeJustificativa: true,
  itens: [{ nome: "", exigeFoto: false }] as Item[],
  usuariosIds: [] as string[],
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(json.error?.message || "Não foi possível concluir.");
  return json.data as T;
}

export function PaginaModelos({ admin }: { admin: boolean }) {
  const [lista, setLista] = useState<Modelo[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState<typeof VAZIO | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function carregar() {
    setLoading(true);
    setErro("");
    try {
      setLista(await api<Modelo[]>("/api/operacao/checklist-modelos"));
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível carregar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
    void api<Pessoa[]>("/api/operacao/usuarios").then(setPessoas).catch(() => setPessoas([]));
  }, []);

  function alternarDia(dia: number) {
    if (!form) return;
    const tem = form.diasSemana.includes(dia);
    setForm({
      ...form,
      diasSemana: tem ? form.diasSemana.filter((item) => item !== dia) : [...form.diasSemana, dia].sort(),
    });
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setEnviando(true);
    setErro("");
    try {
      const payload = { ...form, itens: form.itens.filter((item) => item.nome.trim()) };
      if (editId) {
        await api(`/api/operacao/checklist-modelos/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await api("/api/operacao/checklist-modelos", {
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

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Operação</p>
          <h1 className="page-title">Modelos de checklist</h1>
        </div>
        {admin ? (
          <button type="button" className="min-h-11 rounded-full bg-forest px-4 text-sm font-semibold text-white" onClick={() => { setEditId(null); setForm({ ...VAZIO, itens: [{ nome: "", exigeFoto: false }], usuariosIds: [] }); }}>
            Novo modelo
          </button>
        ) : null}
      </div>
      {erro ? <p className="mt-4 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">{erro}</p> : null}
      {loading ? <div className="mt-4 h-40 animate-pulse rounded-[var(--radius-card)] bg-surface" /> : null}
      {!loading && lista.length === 0 ? (
        <p className="mt-4 rounded-[var(--radius-card)] border border-card-line bg-surface px-4 py-10 text-center text-sm text-muted">
          Nenhum modelo. O histórico importado não tinha modelos.
        </p>
      ) : null}
      <ul className="mt-4 space-y-3">
        {lista.map((modelo) => (
          <li key={modelo.id} className="rounded-[var(--radius-card)] border border-card-line bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{modelo.nome}</p>
                <p className="text-sm text-muted">
                  {modelo.departamento === "ZELADORIA" ? "Zeladoria" : "Limpeza"} · {modelo.diasSemana.map((dia) => DIAS[dia]).join(" ")} · {modelo.itens.length} itens
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${modelo.ativo ? "bg-forest-soft text-forest" : "bg-page text-muted"}`}>
                {modelo.ativo ? "Ativo" : "Inativo"}
              </span>
            </div>
            {admin ? (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="min-h-11 rounded-full border border-line px-3 text-sm font-medium text-forest"
                  onClick={() => {
                    setEditId(modelo.id);
                    setForm({
                      nome: modelo.nome,
                      descricao: modelo.descricao || "",
                      departamento: modelo.departamento,
                      diasSemana: modelo.diasSemana,
                      exigeFoto: modelo.exigeFoto,
                      exigeJustificativa: modelo.exigeJustificativa,
                      itens: modelo.itens.map((item) => ({ nome: item.nome, exigeFoto: item.exigeFoto })),
                      usuariosIds: modelo.atribuicoes.map((item) => item.usuario.id),
                    });
                  }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="min-h-11 rounded-full border border-line px-3 text-sm font-medium text-muted"
                  onClick={() =>
                    void api(`/api/operacao/checklist-modelos/${modelo.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ acao: "alternar" }),
                    }).then(() => carregar()).catch((error) => setErro(error.message))
                  }
                >
                  {modelo.ativo ? "Desativar" : "Ativar"}
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {form ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center">
          <form onSubmit={salvar} className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[var(--radius-card)] bg-surface p-5 sm:rounded-[var(--radius-card)]">
            <h2 className="text-lg font-bold">{editId ? "Editar modelo" : "Novo modelo"}</h2>
            <label className="mt-3 block text-sm font-medium" htmlFor="nome-modelo">Nome</label>
            <input id="nome-modelo" required className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-page px-3 text-sm" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            <fieldset className="mt-3">
              <legend className="text-sm font-medium">Departamento</legend>
              <label className="mt-2 flex min-h-11 items-center gap-2 text-sm"><input type="radio" checked={form.departamento === "ZELADORIA"} onChange={() => setForm({ ...form, departamento: "ZELADORIA" })} /> Zeladoria</label>
              <label className="flex min-h-11 items-center gap-2 text-sm"><input type="radio" checked={form.departamento === "LIMPEZA"} onChange={() => setForm({ ...form, departamento: "LIMPEZA" })} /> Limpeza</label>
            </fieldset>
            <p className="mt-3 text-sm font-medium">Dias</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {DIAS.map((letra, indice) => (
                <button key={`${letra}-${indice}`} type="button" className={`min-h-11 min-w-11 rounded-full text-sm font-semibold ${form.diasSemana.includes(indice) ? "bg-forest text-white" : "border border-line"}`} onClick={() => alternarDia(indice)} aria-pressed={form.diasSemana.includes(indice)}>
                  {letra}
                </button>
              ))}
            </div>
            <label className="mt-3 flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={form.exigeFoto} onChange={(e) => setForm({ ...form, exigeFoto: e.target.checked })} /> Exige foto</label>
            <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={form.exigeJustificativa} onChange={(e) => setForm({ ...form, exigeJustificativa: e.target.checked })} /> Exige justificativa</label>
            <p className="mt-3 text-sm font-medium">Itens</p>
            {form.itens.map((item, indice) => (
              <div key={indice} className="mt-2 flex gap-2">
                <input className="min-h-11 flex-1 rounded-2xl border border-line bg-page px-3 text-sm" value={item.nome} placeholder="Nome do item" onChange={(e) => {
                  const itens = [...form.itens];
                  itens[indice] = { ...item, nome: e.target.value };
                  setForm({ ...form, itens });
                }} />
                <button type="button" className="min-h-11 rounded-full border border-danger px-3 text-sm text-danger" disabled={form.itens.length === 1} onClick={() => setForm({ ...form, itens: form.itens.filter((_, i) => i !== indice) })}>Remover</button>
              </div>
            ))}
            <button type="button" className="mt-2 min-h-11 text-sm font-medium text-forest" onClick={() => setForm({ ...form, itens: [...form.itens, { nome: "", exigeFoto: false }] })}>Adicionar item</button>
            <p className="mt-3 text-sm font-medium">Atribuir a</p>
            {pessoas.map((pessoa) => (
              <label key={pessoa.id} className="mt-1 flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.usuariosIds.includes(pessoa.id)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      usuariosIds: e.target.checked
                        ? [...form.usuariosIds, pessoa.id]
                        : form.usuariosIds.filter((id) => id !== pessoa.id),
                    })
                  }
                />
                {pessoa.nome}
              </label>
            ))}
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
