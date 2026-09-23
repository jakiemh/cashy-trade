"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import EquityCurve from "@/components/EquityCurve";
import MonthlyStats from "@/components/MonthlyStats";
import WeeklyStats from "@/components/WeeklyStats";
import { PageHeader, StatCard } from "@/components/ui";
import { useLocale } from "@/contexts/LocaleContext";
import {
  AccountTypeFilter,
  api,
  DashboardDateRange,
  DashboardStats,
  EquityPoint,
  MonthlyDashboardPoint,
  WeeklyDashboardPoint,
  getToken,
} from "@/lib/api";
import {
  DATE_PRESET_IDS,
  DatePresetId,
  detectActiveDatePreset,
  getDatePresetRange,
} from "@/lib/datePresets";

type PeriodView = "week" | "month";

const PRESET_LABEL_KEY: Record<DatePresetId, "dashboard.presetThisWeek" | "dashboard.presetThisMonth" | "dashboard.presetLast30Days"> = {
  thisWeek: "dashboard.presetThisWeek",
  thisMonth: "dashboard.presetThisMonth",
  last30Days: "dashboard.presetLast30Days",
};

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [equity, setEquity] = useState<EquityPoint[]>([]);
  const [monthly, setMonthly] = useState<MonthlyDashboardPoint[]>([]);
  const [weekly, setWeekly] = useState<WeeklyDashboardPoint[]>([]);
  const [accountFilter, setAccountFilter] = useState<AccountTypeFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [periodView, setPeriodView] = useState<PeriodView>("week");
  const [error, setError] = useState("");

  const dateRange: DashboardDateRange | undefined = useMemo(() => {
    if (!dateFrom && !dateTo) return undefined;
    return {
      ...(dateFrom ? { from: dateFrom } : {}),
      ...(dateTo ? { to: dateTo } : {}),
    };
  }, [dateFrom, dateTo]);

  const hasDateFilter = Boolean(dateFrom || dateTo);
  const activePreset = detectActiveDatePreset(dateFrom, dateTo);

  function applyPreset(id: DatePresetId) {
    const { from, to } = getDatePresetRange(id);
    setDateFrom(from);
    setDateTo(to);
  }

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }

    api
      .stats(accountFilter, dateRange)
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : t("common.error")));

    api
      .equity(accountFilter, dateRange)
      .then(setEquity)
      .catch(() => setEquity([]));

    api
      .monthlyStats(accountFilter, dateRange)
      .then(setMonthly)
      .catch(() => setMonthly([]));

    api
      .weeklyStats(accountFilter, dateRange)
      .then(setWeekly)
      .catch(() => setWeekly([]));
  }, [router, t, accountFilter, dateRange]);

  return (
    <AppShell>
      <PageHeader title={t("dashboard.title")} subtitle={t("dashboard.subtitle")} />
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={accountFilter === "all" ? "nav-pill-active" : "nav-pill"}
          onClick={() => setAccountFilter("all")}
        >
          {t("dashboard.filterAll")}
        </button>
        <button
          type="button"
          className={accountFilter === "real" ? "nav-pill-active" : "nav-pill"}
          onClick={() => setAccountFilter("real")}
        >
          {t("dashboard.filterReal")}
        </button>
        <button
          type="button"
          className={accountFilter === "paper" ? "nav-pill-active" : "nav-pill"}
          onClick={() => setAccountFilter("paper")}
        >
          {t("dashboard.filterPaper")}
        </button>
      </div>

      <div className="glass-card mb-4 flex flex-wrap items-end gap-3 p-4">
        <div className="flex w-full flex-wrap gap-2 pb-1">
          {DATE_PRESET_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={activePreset === id ? "nav-pill-active" : "nav-pill"}
              onClick={() => applyPreset(id)}
            >
              {t(PRESET_LABEL_KEY[id])}
            </button>
          ))}
        </div>
        <div>
          <label htmlFor="dashboard-from" className="mb-1 block text-xs font-medium text-muted">
            {t("dashboard.dateFrom")}
          </label>
          <input
            id="dashboard-from"
            type="date"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="dashboard-to" className="mb-1 block text-xs font-medium text-muted">
            {t("dashboard.dateTo")}
          </label>
          <input
            id="dashboard-to"
            type="date"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        {hasDateFilter ? (
          <button
            type="button"
            className="nav-pill"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
          >
            {t("dashboard.clearDates")}
          </button>
        ) : null}
        <p className="w-full text-xs text-muted">{t("dashboard.dateFilterHint")}</p>
      </div>

      {error ? <p className="text-rose-600">{error}</p> : null}
      {stats ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={t("dashboard.winRate")}
              value={`${stats.win_rate}%`}
              hint={`${stats.closed_trades} ${t("dashboard.closedTrades")}`}
            />
            <StatCard
              label={t("dashboard.totalPnl")}
              value={`${stats.total_pnl_usd >= 0 ? "" : "-"}$${Math.abs(stats.total_pnl_usd).toFixed(2)}`}
              valueTone={stats.total_pnl_usd >= 0 ? "positive" : "negative"}
            />
            <StatCard
              label={t("dashboard.avgPnl")}
              value={`${stats.avg_pnl_pct >= 0 ? "+" : ""}${stats.avg_pnl_pct.toFixed(1)}%`}
              hint={t("dashboard.perClosedTrade")}
              valueTone={stats.avg_pnl_pct >= 0 ? "positive" : "negative"}
            />
            <StatCard
              label={hasDateFilter ? t("dashboard.signalsInPeriod") : t("dashboard.signalsToday")}
              value={`${stats.signals_today}`}
              hint={`${stats.signals_taken} ${t("dashboard.takenPct")} (${stats.signals_conversion_pct}%)`}
            />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <EquityCurve points={equity} filtered={hasDateFilter} />
            </div>
            <StatCard
              label={t("dashboard.openTrades")}
              value={`${stats.open_trades}`}
              hint={`${stats.total_trades} ${t("dashboard.totalTrades")}`}
            />
          </div>
          <div className="mt-4">
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                className={periodView === "week" ? "nav-pill-active" : "nav-pill"}
                onClick={() => setPeriodView("week")}
              >
                {t("dashboard.viewWeekly")}
              </button>
              <button
                type="button"
                className={periodView === "month" ? "nav-pill-active" : "nav-pill"}
                onClick={() => setPeriodView("month")}
              >
                {t("dashboard.viewMonthly")}
              </button>
            </div>
            {periodView === "week" ? <WeeklyStats points={weekly} /> : <MonthlyStats points={monthly} />}
          </div>
        </>
      ) : (
        <p className="text-muted">{t("dashboard.loadingStats")}</p>
      )}
    </AppShell>
  );
}
