"use client";

import { mesLabel } from "@/lib/format";

type Ponto = { competencia: string; saldoCents: number; qualidade: string };

export function AreaChartSaldo({
  serie,
  foco,
  onFoco,
}: {
  serie: Ponto[];
  foco: string | null;
  onFoco: (competencia: string) => void;
}) {
  if (serie.length === 0) {
    return <p className="text-sm text-muted">Sem série de saldo neste recorte.</p>;
  }
  const max = Math.max(...serie.map((p) => p.saldoCents), 1);
  const min = Math.min(...serie.map((p) => p.saldoCents), 0);
  const span = Math.max(max - min, 1);
  const w = 640;
  const h = 220;
  const pad = 16;
  const coords = serie.map((p, i) => {
    const x = pad + (i / Math.max(serie.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - ((p.saldoCents - min) / span) * (h - pad * 2);
    return { ...p, x, y };
  });
  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  const area = `${line} L ${coords.at(-1)?.x} ${h - pad} L ${coords[0].x} ${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-56 w-full" role="img" aria-label="Gráfico de área do saldo gerencial">
      <defs>
        <linearGradient id="saldoFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#185a49" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#185a49" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path className="js-area" d={area} fill="url(#saldoFill)" />
      <path
        className="js-line"
        d={line}
        fill="none"
        stroke="#185a49"
        strokeWidth="3"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        style={{ strokeDashoffset: 0 }}
      />
      {coords.map((c) => (
        <g key={c.competencia}>
          <circle
            cx={c.x}
            cy={c.y}
            r={c.competencia === foco ? 7 : 4}
            fill={c.competencia === foco ? "#185a49" : "#2f8a6a"}
          />
          <rect
            x={c.x - 14}
            y={pad}
            width={28}
            height={h - pad * 2}
            fill="transparent"
            className="cursor-pointer"
            onClick={() => onFoco(c.competencia)}
          >
            <title>{`${mesLabel(c.competencia)}`}</title>
          </rect>
        </g>
      ))}
    </svg>
  );
}
