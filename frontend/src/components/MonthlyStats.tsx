"use client";

import { useLocale } from "@/contexts/LocaleContext";
import { MonthlyDashboardPoint } from "@/lib/api";
import { formatMoney } from "@/components/ui";

type MonthlyStatsProps = {
  points: MonthlyDashboardPoint[];
};

function formatMonthLabel(month: string, locale: string) {
  const [year, monthNum] = month.split("-").map(Number);
  const date = new Date(year, monthNum - 1, 1);
  return date.toLocaleDateString(locale === "es" ? "es-ES" : "en-US", {
    month: "short",
    year: "numeric",
  });
}

export default function MonthlyStats({ points }: MonthlyStatsProps) {
  const { t, locale } = useLocale();

  if (!points.length) {
    return (
      <div className="glass-card">
        <h3 className="text-sm font-medium text-slate-700">{t("dashboard.monthlyTitle")}</h3>
        <p className="mt-2 text-sm text-muted">{t("dashboard.monthlyEmpty")}</p>
      </div>
    );
  }

  const rows = [...points].reverse();
  const maxSignals = Math.max(...rows.map((row) => row.signals_received), 1);
  const maxAbsPnl = Math.max(...rows.map((row) => Math.abs(row.pnl_usd)), 1);

  return (
    <div className="glass-card">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-slate-700">{t("dashboard.monthlyTitle")}</h3>
        <p className="text-xs text-muted">{t("dashboard.monthlySubtitle")}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-muted">
              <th className="pb-3 pr-4 font-medium">{t("dashboard.monthColumn")}</th>
              <th className="pb-3 pr-4 font-medium">{t("dashboard.signalsVsTrades")}</th>
              <th className="pb-3 pr-4 font-medium">{t("dashboard.conversionColumn")}</th>
              <th className="pb-3 pr-4 font-medium">{t("dashboard.pnlColumn")}</th>
              <th className="pb-3 font-medium">{t("dashboard.winRateColumn")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const signalWidth = (row.signals_received / maxSignals) * 100;
              const takenWidth = (row.trades_taken / maxSignals) * 100;
              const pnlWidth = (Math.abs(row.pnl_usd) / maxAbsPnl) * 100;
              const pnlPositive = row.pnl_usd >= 0;

              return (
                <tr key={row.month} className="border-b border-slate-100 last:border-0">
                  <td className="py-3 pr-4 font-medium text-slate-700">
                    {formatMonthLabel(row.month, locale)}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-14 text-muted">{t("dashboard.signalsShort")}</span>
                        <div className="h-2 flex-1 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-sky-400"
                            style={{ width: `${signalWidth}%` }}
                          />
                        </div>
                        <span className="w-6 text-right tabular-nums">{row.signals_received}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-14 text-muted">{t("dashboard.tradesShort")}</span>
                        <div className="h-2 flex-1 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-violet-500"
                            style={{ width: `${takenWidth}%` }}
                          />
                        </div>
                        <span className="w-6 text-right tabular-nums">{row.trades_taken}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 tabular-nums text-slate-700">{row.conversion_pct}%</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 rounded-full bg-slate-100">
                        <div
                          className={`h-2 rounded-full ${pnlPositive ? "bg-emerald-500" : "bg-rose-500"}`}
                          style={{ width: `${pnlWidth}%` }}
                        />
                      </div>
                      <span
                        className={`tabular-nums font-medium ${pnlPositive ? "text-emerald-600" : "text-rose-600"}`}
                      >
                        {formatMoney(row.pnl_usd)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className="tabular-nums text-slate-700">{row.win_rate}%</span>
                    <span className="ml-1 text-xs text-muted">
                      ({row.closed_trades} {t("dashboard.closedShort")})
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
