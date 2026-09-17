import Link from "next/link";

type Props = {
  detalhe: string;
};

export function SemPermissao({ detalhe }: Props) {
  return (
    <div>
      <h1 className="page-title">Sem permissão</h1>
      <p className="mt-2 text-sm text-muted">{detalhe}</p>
      <Link href="/" className="mt-4 inline-flex min-h-11 items-center font-semibold text-forest">
        Voltar à Visão Geral
      </Link>
    </div>
  );
}
