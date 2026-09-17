"use client";

import { useEffect, useState } from "react";
import { PAPEL_ADMIN, PAPEL_LEITURA, SENHA_MINIMA, rotuloPapel } from "@/lib/auth/papeis";

type UsuarioRow = {
  id: string;
  nome: string;
  email: string;
  papel: string;
  ativo: boolean;
  criadoEm: string;
};

type Props = {
  euId: string;
};

export function PaginaUsuarios({ euId }: Props) {
  const [lista, setLista] = useState<UsuarioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [aberto, setAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    senha: "",
    papel: PAPEL_LEITURA,
  });

  async function carregar() {
    setErro("");
    setLoading(true);
    try {
      const res = await fetch("/api/usuarios", { credentials: "same-origin" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErro(json.error?.message ?? "Não foi possível listar usuários.");
        return;
      }
      setLista(json.data);
    } catch {
      setErro("Não foi possível listar usuários.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro("");
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErro(json.error?.message ?? "Não foi possível criar.");
        return;
      }
      setAberto(false);
      setForm({ nome: "", email: "", senha: "", papel: PAPEL_LEITURA });
      await carregar();
    } catch {
      setErro("Não foi possível criar.");
    } finally {
      setEnviando(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setErro("");
    const res = await fetch(`/api/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      setErro(json.error?.message ?? "Não foi possível atualizar.");
      return;
    }
    await carregar();
  }

  async function redefinir(id: string) {
    const senha = window.prompt(`Nova senha (mínimo ${SENHA_MINIMA} caracteres)`);
    if (!senha) return;
    await patch(id, { senha });
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Usuários</h1>
          <p className="mt-1 text-sm text-muted">Quem pode entrar neste condomínio.</p>
        </div>
        <button
          type="button"
          className="min-h-11 rounded-full bg-forest px-4 text-sm font-semibold text-white"
          onClick={() => setAberto(true)}
        >
          Novo usuário
        </button>
      </div>

      {erro ? (
        <p className="mt-4 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
          {erro}
        </p>
      ) : null}

      {loading ? (
        <div className="mt-6 h-40 animate-pulse rounded-[var(--radius-card)] bg-surface" />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-[var(--radius-card)] border border-card-line bg-surface">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Papel</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium">
                    {u.nome}
                    {u.id === euId ? <span className="ml-2 text-xs text-muted">(você)</span> : null}
                  </td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{rotuloPapel(u.papel)}</td>
                  <td className="px-4 py-3">{u.ativo ? "Ativo" : "Inativo"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="min-h-11 rounded-full border border-line px-3 text-xs font-medium"
                        onClick={() =>
                          void patch(u.id, {
                            papel: u.papel === PAPEL_ADMIN ? PAPEL_LEITURA : PAPEL_ADMIN,
                          })
                        }
                      >
                        {u.papel === PAPEL_ADMIN ? "Tornar leitura" : "Tornar admin"}
                      </button>
                      <button
                        type="button"
                        className="min-h-11 rounded-full border border-line px-3 text-xs font-medium"
                        onClick={() => void patch(u.id, { ativo: !u.ativo })}
                      >
                        {u.ativo ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        type="button"
                        className="min-h-11 rounded-full border border-line px-3 text-xs font-medium"
                        onClick={() => void redefinir(u.id)}
                      >
                        Redefinir senha
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {aberto ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4">
          <form
            onSubmit={criar}
            className="w-full max-w-md rounded-t-[var(--radius-card)] border border-card-line bg-surface p-5 sm:rounded-[var(--radius-card)]"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Novo usuário</h2>
              <button type="button" className="min-h-11 px-2" onClick={() => setAberto(false)}>
                Fechar
              </button>
            </div>
            <label className="mt-4 block text-sm font-medium" htmlFor="nome">
              Nome
            </label>
            <input
              id="nome"
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-page px-3 text-sm"
            />
            <label className="mt-3 block text-sm font-medium" htmlFor="email-novo">
              E-mail
            </label>
            <input
              id="email-novo"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-page px-3 text-sm"
            />
            <label className="mt-3 block text-sm font-medium" htmlFor="senha-nova">
              Senha inicial
            </label>
            <input
              id="senha-nova"
              type="password"
              required
              minLength={SENHA_MINIMA}
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
              className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-page px-3 text-sm"
            />
            <fieldset className="mt-3">
              <legend className="text-sm font-medium">Papel</legend>
              <label className="mt-2 flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="papel"
                  checked={form.papel === PAPEL_LEITURA}
                  onChange={() => setForm({ ...form, papel: PAPEL_LEITURA })}
                />
                Leitura
              </label>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="papel"
                  checked={form.papel === PAPEL_ADMIN}
                  onChange={() => setForm({ ...form, papel: PAPEL_ADMIN })}
                />
                Admin
              </label>
            </fieldset>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="min-h-11 flex-1 rounded-full border border-line"
                onClick={() => setAberto(false)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando}
                className="min-h-11 flex-1 rounded-full bg-forest font-semibold text-white disabled:opacity-60"
              >
                {enviando ? "Criando…" : "Criar"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
