"use client";

import { useState } from "react";
import { SENHA_MINIMA } from "@/lib/auth/papeis";

export function ContaSenhaForm() {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setMsg("");
    setEnviando(true);
    try {
      const res = await fetch("/api/conta/senha", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ senhaAtual, senhaNova }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErro(json.error?.message ?? "Não foi possível alterar a senha.");
        return;
      }
      setMsg("Senha atualizada.");
      setSenhaAtual("");
      setSenhaNova("");
    } catch {
      setErro("Não foi possível alterar a senha.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="page-title">Minha senha</h1>
      <form onSubmit={onSubmit} className="mt-6 rounded-[var(--radius-card)] border border-card-line bg-surface p-5">
        <label className="block text-sm font-medium" htmlFor="atual">
          Senha atual
        </label>
        <input
          id="atual"
          type="password"
          required
          value={senhaAtual}
          onChange={(e) => setSenhaAtual(e.target.value)}
          className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-page px-3 text-sm"
        />
        <label className="mt-3 block text-sm font-medium" htmlFor="nova">
          Nova senha
        </label>
        <input
          id="nova"
          type="password"
          required
          minLength={SENHA_MINIMA}
          value={senhaNova}
          onChange={(e) => setSenhaNova(e.target.value)}
          className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-page px-3 text-sm"
        />
        {erro ? (
          <p className="mt-3 text-sm text-danger" role="alert">
            {erro}
          </p>
        ) : null}
        {msg ? <p className="mt-3 text-sm text-forest">{msg}</p> : null}
        <button
          type="submit"
          disabled={enviando}
          className="mt-5 min-h-11 w-full rounded-full bg-forest text-sm font-semibold text-white disabled:opacity-60"
        >
          {enviando ? "Salvando…" : "Salvar"}
        </button>
      </form>
    </div>
  );
}
