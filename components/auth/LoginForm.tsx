"use client";

import { useState } from "react";
import { BrandLogo } from "@/components/shell/BrandLogo";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, senha }),
      });
      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: { message?: string } }
        | null;
      if (!res.ok || !json?.success) {
        setErro(json?.error?.message ?? "E-mail ou senha inválidos.");
        return;
      }
      window.location.assign("/");
    } catch {
      setErro("Não foi possível entrar. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 flex flex-col items-center">
        <BrandLogo variant="sidebar" />
        <p className="mt-2 text-center text-sm text-muted">Prestação de contas</p>
      </div>
      <form
        onSubmit={onSubmit}
        className="rounded-[var(--radius-card)] border border-card-line bg-surface p-5 shadow-card sm:p-6"
      >
        <h1 className="page-title">Entrar</h1>
        <p className="mt-1 text-sm text-muted">Use o e-mail cadastrado pelo administrador.</p>
        <label className="mt-5 block text-sm font-medium" htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-page px-3 text-sm"
        />
        <label className="mt-4 block text-sm font-medium" htmlFor="senha">
          Senha
        </label>
        <input
          id="senha"
          type="password"
          autoComplete="current-password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-page px-3 text-sm"
        />
        {erro ? (
          <p className="mt-3 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
            {erro}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={enviando}
          className="mt-5 min-h-11 w-full rounded-full bg-forest text-sm font-semibold text-white disabled:opacity-60"
        >
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
