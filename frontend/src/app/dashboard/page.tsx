"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import EquityCurve from "@/components/EquityCurve";
import MonthlyStats from "@/components/MonthlyStats";
import { PageHeader, StatCard } from "@/components/ui";
import { useLocale } from "@/contexts/LocaleContext";
import { api, DashboardStats, EquityPoint, MonthlyDashboardPoint, getToken } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [equity, setEquity] = useState<EquityPoint[]>([]);
  const [monthly, setMonthly] = useState<MonthlyDashboardPoint[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }

    api
      .stats()
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : t("common.error")));

    api
      .equity()
      .then(setEquity)
      .catch(() => setEquity([]));

    api
      .monthlyStats()
      .then(setMonthly)
      .catch(() => setMonthly([]));
  }, [router, t]);

  return (
    <AppShell>
      <PageHeader title={t("dashboard.title")} subtitle={t("dashboard.subtitle")} />
      {error ? <p className="text-rose-600">{error}</p> : null}
      {stats ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={t("dashboard.winRate")}
              value={`${stats.win_rate}%`}
              hint={`${stats.closed_trades} ${t("dashboard.closedTrades")}`}
            />
            <StatCard label={t("dashboard.totalPnl")} value={`$${stats.total_pnl_usd.toFixed(2)}`} />
            <StatCard
              label={t("dashboard.avgPnl")}
              value={`${stats.avg_pnl_pct >= 0 ? "+" : ""}${stats.avg_pnl_pct.toFixed(1)}%`}
              hint={t("dashboard.perClosedTrade")}
            />
            <StatCard
              label={t("dashboard.signalsToday")}
              value={`${stats.signals_today}`}
              hint={`${stats.signals_taken} ${t("dashboard.takenPct")} (${stats.signals_conversion_pct}%)`}
            />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <EquityCurve points={equity} />
            </div>
            <StatCard
              label={t("dashboard.openTrades")}
              value={`${stats.open_trades}`}
              hint={`${stats.total_trades} ${t("dashboard.totalTrades")}`}
            />
          </div>
          <div className="mt-4">
            <MonthlyStats points={monthly} />
          </div>
        </>
      ) : (
        <p className="text-muted">{t("dashboard.loadingStats")}</p>
      )}
    </AppShell>
  );
}
