"use client";

import { formatBRL } from "@/lib/format";
import type { AnaliseTaxaPayload } from "@/lib/analise-taxa";

export function AnaliseTaxaDemo({
  dados,
  onIrNovaTaxa,
}: {
  dados: AnaliseTaxaPayload;
  onIrNovaTaxa: () => void;
}) {
  return (
    <article
      className="js-block min-w-0 rounded-3xl border border-card-line bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5"
      aria-labelledby="analise-taxa-titulo"
    >
      <h2 id="analise-taxa-titulo" className="text-lg font-bold">
        Demonstrativo da taxa
      </h2>
      <p className="mt-1 text-sm text-muted">
        Cotas de condomínio menos contratos fixos e manutenção, mais cotas de acordo. Não é a cobertura da cota
        contra todas as despesas.
      </p>

      <dl className="mt-5 space-y-3">
        {dados.linhas.map((linha) => {
          if (linha.papel === "resultado") {
            return (
              <div key={linha.id} className="border-t border-line pt-4">
                <dt className="text-sm font-semibold text-muted">{linha.rotulo}</dt>
                <dd
                  className="mt-1 font-extrabold tabular-nums tracking-tight text-forest"
                  style={{ fontSize: "clamp(1.85rem, 1.2rem + 2.4vw, 2.75rem)" }}
                >
                  {formatBRL(linha.valorCents)}
                </dd>
              </div>
            );
          }
          const sinal = linha.papel === "saida" ? "−" : linha.id === "acordo" ? "+" : "";
          return (
            <div key={linha.id} className="flex items-start justify-between gap-3 text-sm">
              <dt className={linha.papel === "subtotal" ? "font-semibold" : "text-muted"}>{linha.rotulo}</dt>
              <dd
                className={`shrink-0 tabular-nums ${linha.papel === "subtotal" ? "font-bold" : "font-semibold"}`}
              >
                {sinal ? `${sinal} ` : ""}
                {formatBRL(linha.valorCents)}
              </dd>
            </div>
          );
        })}
      </dl>

      <p className="mt-6 text-sm">
        <button
          type="button"
          className="font-semibold text-forest underline-offset-2 hover:underline"
          onClick={onIrNovaTaxa}
        >
          Precisa da taxa do próximo período? → Nova taxa condominial
        </button>
      </p>
    </article>
  );
}
