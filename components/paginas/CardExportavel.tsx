"use client";

import { FileDown } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cardPrintEmAndamento, exportarCardPdf } from "@/lib/exportar-card";

export const CARD_SHELL =
  "relative min-w-0 rounded-3xl border border-card-line bg-surface p-4 pr-14 shadow-[var(--shadow-card)] sm:p-5 sm:pr-14";

export type CardExportMeta = {
  tela: string;
  recorteLabel: string;
  condominio?: string;
};

const CardExportContext = createContext<CardExportMeta | null>(null);

export function CardExportProvider({ value, children }: { value: CardExportMeta; children: ReactNode }) {
  return <CardExportContext.Provider value={value}>{children}</CardExportContext.Provider>;
}

type Tag = "article" | "section" | "div";

type Props = {
  titulo: string;
  tela?: string;
  recorteLabel?: string;
  condominio?: string;
  as?: Tag;
  className?: string;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, "className" | "children">;

export function CardExportavel({
  titulo,
  tela,
  recorteLabel,
  condominio,
  as = "article",
  className = "",
  children,
  ...rest
}: Props) {
  const ctx = useContext(CardExportContext);
  const root = useRef<HTMLElement | null>(null);
  const setRoot = (node: HTMLElement | null) => {
    root.current = node;
  };
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const telaFinal = tela ?? ctx?.tela ?? "";
  const recorteFinal = recorteLabel ?? ctx?.recorteLabel ?? "";
  const marca = condominio ?? ctx?.condominio ?? "Canto do Sabiá · Código 132";
  const geradoEm = new Date().toLocaleDateString("pt-BR");
  const classes = `${CARD_SHELL} ${className}`.trim();

  const gerar = useCallback(() => {
    setAviso(null);
    const el = root.current;
    if (!el) {
      setAviso("Não foi possível abrir a impressão.");
      return;
    }
    if (cardPrintEmAndamento()) {
      setAviso(
        document.body.classList.contains("print-folha-unidade")
          ? "Feche o relatório por unidade antes de gerar o PDF do card."
          : "Já há uma impressão em andamento.",
      );
      return;
    }
    setOcupado(true);
    const resultado = exportarCardPdf(el);
    if (!resultado.ok) {
      setOcupado(false);
      setAviso(resultado.motivo);
      return;
    }
    const soltar = () => setOcupado(false);
    window.addEventListener("afterprint", soltar, { once: true });
    window.setTimeout(soltar, 120_000);
  }, []);

  const inner = (
    <>
      <div className="print-only mb-3 border-b border-line pb-3 text-xs text-muted" aria-hidden="true">
        <p className="font-semibold text-ink">{marca}</p>
        <p>
          {telaFinal}
          {telaFinal && recorteFinal ? " · " : ""}
          {recorteFinal}
          {telaFinal || recorteFinal ? " · " : ""}
          {geradoEm}
        </p>
        <p className="mt-1 font-semibold text-ink">{titulo}</p>
      </div>
      <button
        type="button"
        className="no-print absolute top-3 right-3 z-10 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-line bg-surface text-forest shadow-sm"
        aria-label={`Gerar PDF deste card: ${titulo}`}
        aria-busy={ocupado || undefined}
        disabled={ocupado}
        onClick={gerar}
      >
        <FileDown className="size-4" aria-hidden />
      </button>
      {aviso ? (
        <p className="no-print mb-2 text-xs text-danger" role="status" aria-live="polite">
          {aviso}
        </p>
      ) : null}
      {children}
    </>
  );

  if (as === "section") {
    return (
      <section ref={setRoot} className={classes} {...rest}>
        {inner}
      </section>
    );
  }
  if (as === "div") {
    return (
      <div ref={setRoot} className={classes} {...rest}>
        {inner}
      </div>
    );
  }
  return (
    <article ref={setRoot} className={classes} {...rest}>
      {inner}
    </article>
  );
}
