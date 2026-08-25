"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { Badge, PageHeader, StatCard } from "@/components/ui";
import { useLocale } from "@/contexts/LocaleContext";
import { api, AdminStats, AdminUser, getToken, Signal } from "@/lib/api";

export default function AdminPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const [statsData, usersData, signalsData] = await Promise.all([
      api.adminStats(),
      api.adminUsers(),
      api.adminSignals(),
    ]);
    setStats(statsData);
    setUsers(usersData);
    setSignals(signalsData);
    setError("");
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    load().catch((err) => {
      setError(err instanceof Error ? err.message : t("admin.accessDenied"));
    });
  }, [router, load, t]);

  async function deleteSignal(signal: Signal) {
    const ok = window.confirm(
      t("admin.deleteConfirm", { symbol: signal.symbol, type: signal.type })
    );
    if (!ok) return;
    setDeletingId(signal.id);
    try {
      await api.deleteAdminSignal(signal.id);
      setSignals((current) => current.filter((item) => item.id !== signal.id));
      if (stats) {
        setStats({ ...stats, total_signals: Math.max(0, stats.total_signals - 1) });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AppShell>
      <PageHeader title={t("admin.title")} subtitle={t("admin.subtitle")} />
      {error ? <p className="text-rose-600">{error}</p> : null}
      {stats ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard label={t("admin.users")} value={`${stats.total_users}`} />
            <StatCard label={t("admin.signals")} value={`${stats.total_signals}`} />
            <StatCard label={t("admin.trades")} value={`${stats.total_trades}`} />
            <StatCard label={t("admin.openTrades")} value={`${stats.open_trades}`} />
            <StatCard label={t("admin.signalsToday")} value={`${stats.signals_today}`} />
          </div>

          <div className="glass-card mt-6 overflow-x-auto">
            <h3 className="mb-4 text-sm font-medium text-slate-700">{t("admin.recentSignals")}</h3>
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-emerald-100 text-muted">
                  <th className="py-2 pr-4">ID</th>
                  <th className="py-2 pr-4">{t("admin.typeCol")}</th>
                  <th className="py-2 pr-4">{t("admin.symbolCol")}</th>
                  <th className="py-2 pr-4">{t("admin.timeCol")}</th>
                  <th className="py-2 pr-4">{t("admin.activeCol")}</th>
                  <th className="py-2">{t("admin.deleteSignal")}</th>
                </tr>
              </thead>
              <tbody>
                {signals.map((signal) => (
                  <tr key={signal.id} className="border-b border-emerald-50 text-slate-700">
                    <td className="py-3 pr-4">{signal.id}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={signal.type === "COMPRA" ? "good" : signal.type === "CIERRE" ? "neutral" : "warn"}>
                        {signal.type}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 font-medium">{signal.symbol}</td>
                    <td className="py-3 pr-4">{new Date(signal.timestamp).toLocaleString()}</td>
                    <td className="py-3 pr-4">{signal.is_active ? "✓" : "-"}</td>
                    <td className="py-3">
                      <button
                        type="button"
                        className="btn-secondary px-3 py-1.5 text-xs"
                        disabled={deletingId === signal.id}
                        onClick={() => deleteSignal(signal)}
                      >
                        {deletingId === signal.id ? "..." : t("admin.deleteSignal")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="glass-card mt-6 overflow-x-auto">
            <h3 className="mb-4 text-sm font-medium text-slate-700">{t("admin.registeredUsers")}</h3>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-emerald-100 text-muted">
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">{t("auth.name")}</th>
                  <th className="py-2 pr-4">{t("settings.language")}</th>
                  <th className="py-2 pr-4">{t("admin.tradesCol")}</th>
                  <th className="py-2 pr-4">{t("admin.adminCol")}</th>
                  <th className="py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-emerald-50 text-slate-700">
                    <td className="py-3 pr-4">{user.email}</td>
                    <td className="py-3 pr-4">{user.name || "-"}</td>
                    <td className="py-3 pr-4">{user.locale}</td>
                    <td className="py-3 pr-4">{user.trade_count}</td>
                    <td className="py-3 pr-4">{user.is_admin ? "✓" : "-"}</td>
                    <td className="py-3">{new Date(user.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : !error ? (
        <p className="text-muted">{t("common.loading")}</p>
      ) : null}
    </AppShell>
  );
}
