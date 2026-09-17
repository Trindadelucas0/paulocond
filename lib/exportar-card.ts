const ATTR = "data-card-print-ativo";
const BODY_CLASS = "print-card-isolado";
const FOLHA_CLASS = "print-folha-unidade";

export function cardPrintEmAndamento(): boolean {
  return (
    document.body.classList.contains(BODY_CLASS) ||
    document.body.classList.contains(FOLHA_CLASS) ||
    Boolean(document.querySelector(`[${ATTR}]`))
  );
}

export function exportarCardPdf(el: HTMLElement): { ok: true } | { ok: false; motivo: string } {
  if (typeof window.print !== "function") {
    return { ok: false, motivo: "Não foi possível abrir a impressão." };
  }
  if (document.body.classList.contains(FOLHA_CLASS)) {
    return { ok: false, motivo: "Feche o relatório por unidade antes de gerar o PDF do card." };
  }
  if (document.body.classList.contains(BODY_CLASS) || document.querySelector(`[${ATTR}]`)) {
    return { ok: false, motivo: "Já há uma impressão em andamento." };
  }

  el.setAttribute(ATTR, "");
  document.body.classList.add(BODY_CLASS);

  const limpar = () => {
    el.removeAttribute(ATTR);
    document.body.classList.remove(BODY_CLASS);
    window.removeEventListener("afterprint", onAfter);
  };

  const onAfter = () => {
    window.clearTimeout(fallback);
    limpar();
  };

  window.addEventListener("afterprint", onAfter);
  const fallback = window.setTimeout(limpar, 120_000);
  window.print();
  return { ok: true };
}
