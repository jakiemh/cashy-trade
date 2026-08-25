"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { PageHeader, StatCard } from "@/components/ui";
import { useLocale } from "@/contexts/LocaleContext";
import { api, AdminStats, AdminUser, getToken } from "@/lib/api";

export default function AdminPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    Promise.all([api.adminStats(), api.adminUsers()])
      .then(([statsData, usersData]) => {
        setStats(statsData);
        setUsers(usersData);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t("admin.accessDenied"));
      });
  }, [router, t]);

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
