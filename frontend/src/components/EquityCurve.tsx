"use client";

import { useLocale } from "@/contexts/LocaleContext";
import { EquityPoint } from "@/lib/api";
import { formatMoney } from "@/components/ui";

type EquityCurveProps = {
  points: EquityPoint[];
  filtered?: boolean;
};

export default function EquityCurve({ points, filtered = false }: EquityCurveProps) {
  const { t } = useLocale();

  if (!points.length) {
    return (
      <div className="glass-card">
        <h3 className="text-sm font-medium text-slate-700">{t("dashboard.equityTitle")}</h3>
        <p className="mt-2 text-sm text-muted">{t("dashboard.equityEmpty")}</p>
      </div>
    );
  }

  const width = 640;
  const height = 220;
  const padding = { top: 20, right: 16, bottom: 32, left: 48 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const values = points.map((point) => point.cumulative_pnl_usd);
  const minVal = Math.min(0, ...values);
  const maxVal = Math.max(0, ...values);
  const range = maxVal - minVal || 1;

  const coords = points.map((point, index) => {
    const x = padding.left + (index / Math.max(points.length - 1, 1)) * innerW;
    const y = padding.top + innerH - ((point.cumulative_pnl_usd - minVal) / range) * innerH;
    return { x, y, point };
  });

  const linePath = coords.map((coord, index) => `${index === 0 ? "M" : "L"} ${coord.x} ${coord.y}`).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${padding.top + innerH} L ${coords[0].x} ${padding.top + innerH} Z`;
  const zeroY = padding.top + innerH - ((0 - minVal) / range) * innerH;
  const last = points[points.length - 1];
  const positive = last.cumulative_pnl_usd >= 0;

  return (
    <div className="glass-card">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-slate-700">{t("dashboard.equityTitle")}</h3>
          <p className="text-xs text-muted">
            {filtered ? t("dashboard.equitySubtitleFiltered") : t("dashboard.equitySubtitle")}
          </p>
        </div>
        <p className={`text-lg font-semibold ${positive ? "text-emerald-600" : "text-rose-600"}`}>
          {formatMoney(last.cumulative_pnl_usd)}
        </p>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-full" role="img" aria-label="Curva de equity">
          <defs>
            <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={positive ? "#34d399" : "#fb7185"} stopOpacity="0.35" />
              <stop offset="100%" stopColor={positive ? "#34d399" : "#fb7185"} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          <line
            x1={padding.left}
            y1={zeroY}
            x2={width - padding.right}
            y2={zeroY}
            stroke="#cbd5e1"
            strokeDasharray="4 4"
          />

          <path d={areaPath} fill="url(#equityFill)" />
          <path d={linePath} fill="none" stroke={positive ? "#059669" : "#e11d48"} strokeWidth="2.5" />

          {coords.map((coord) => (
            <circle
              key={coord.point.date}
              cx={coord.x}
              cy={coord.y}
              r="3.5"
              fill={positive ? "#059669" : "#e11d48"}
            >
              <title>
                {new Date(coord.point.date).toLocaleDateString()} — {formatMoney(coord.point.cumulative_pnl_usd)}
              </title>
            </circle>
          ))}

          <text x={padding.left} y={height - 8} className="fill-slate-400 text-[10px]">
            {new Date(points[0].date).toLocaleDateString()}
          </text>
          <text x={width - padding.right} y={height - 8} textAnchor="end" className="fill-slate-400 text-[10px]">
            {new Date(last.date).toLocaleDateString()}
          </text>
        </svg>
      </div>
    </div>
  );
}
