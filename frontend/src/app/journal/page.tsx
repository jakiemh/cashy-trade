"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import TradeExitModal from "@/components/TradeExitModal";
import { Badge, formatMoney, formatPct, PageHeader } from "@/components/ui";
import { useLocale } from "@/contexts/LocaleContext";
import { api, getToken, Trade } from "@/lib/api";

export default function JournalPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exitTrade, setExitTrade] = useState<Trade | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function load() {
    const data = await api.trades();
    setTrades(data);
  }

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    load().catch((err) => setError(err instanceof Error ? err.message : t("common.error")));
  }, [router, t]);

  async function exportCsv() {
    setExporting(true);
    setError("");
    try {
      await api.exportTrades();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setExporting(false);
    }
  }

  async function deleteTrade(trade: Trade) {
    const ok = window.confirm(t("journal.deleteTradeConfirm", { symbol: trade.symbol }));
    if (!ok) return;
    setDeletingId(trade.id);
    setError("");
    try {
      await api.deleteTrade(trade.id);
      setTrades((current) => current.filter((item) => item.id !== trade.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = trades.filter((trade) => {
    if (statusFilter === "open") return trade.status === "open";
    if (statusFilter === "closed") return trade.status === "closed";
    return true;
  });

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <PageHeader title={t("journal.title")} subtitle={t("journal.subtitle")} />
        <button type="button" className="btn-secondary" onClick={exportCsv} disabled={exporting}>
          {exporting ? t("journal.exporting") : t("journal.exportCsv")}
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={statusFilter === "all" ? "nav-pill-active" : "nav-pill"}
          onClick={() => setStatusFilter("all")}
        >
          {t("journal.all")}
        </button>
        <button
          type="button"
          className={statusFilter === "open" ? "nav-pill-active" : "nav-pill"}
          onClick={() => setStatusFilter("open")}
        >
          {t("journal.open")}
        </button>
        <button
          type="button"
          className={statusFilter === "closed" ? "nav-pill-active" : "nav-pill"}
          onClick={() => setStatusFilter("closed")}
        >
          {t("journal.closed")}
        </button>
      </div>

      {error ? <p className="text-rose-600">{error}</p> : null}
      <div className="space-y-4">
        {filtered.map((trade) => (
          <div key={trade.id} className="glass-card">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-semibold text-slate-800">{trade.symbol}</h3>
              <Badge tone={trade.status === "open" ? "warn" : trade.pnl_pct && trade.pnl_pct >= 0 ? "good" : "bad"}>
                {trade.status === "open" ? t("common.open") : t("common.closed")}
              </Badge>
              <span className="text-sm text-muted">{new Date(trade.entry_at).toLocaleString()}</span>
            </div>
            <div className="mt-4 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
              <p>
                {t("journal.entry")}: {formatMoney(trade.entry_price)} x {trade.entry_qty} {t("journal.shares")}
              </p>
              <p>
                {t("journal.stop")}: {formatMoney(trade.stop_loss)}
              </p>
              <p>
                {t("journal.target")}: {formatMoney(trade.take_profit)}
              </p>
              <p>
                {t("journal.setup")}: {trade.setup_name || trade.strategy || "-"}
              </p>
              {trade.status === "closed" ? (
                <>
                  <p>
                    {t("journal.exit")}: {formatMoney(trade.exit_price)}
                  </p>
                  <p>
                    {t("journal.pnl")}: {formatMoney(trade.pnl_usd)} ({formatPct(trade.pnl_pct)})
                  </p>
                  {trade.exit_reason ? (
                    <p>
                      {t("journal.reason")}: {trade.exit_reason}
                    </p>
                  ) : null}
                </>
              ) : null}
              {trade.notes ? (
                <p className="md:col-span-2">
                  {t("journal.notes")}: {trade.notes}
                </p>
              ) : null}
            </div>
            {trade.status === "open" ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="btn-primary" onClick={() => setExitTrade(trade)}>
                  {t("journal.registerExit")}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={deletingId === trade.id}
                  onClick={() => deleteTrade(trade)}
                >
                  {deletingId === trade.id ? "..." : t("journal.deleteTrade")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn-secondary mt-4"
                disabled={deletingId === trade.id}
                onClick={() => deleteTrade(trade)}
              >
                {deletingId === trade.id ? "..." : t("journal.deleteTrade")}
              </button>
            )}
          </div>
        ))}
        {!filtered.length ? <p className="text-muted">{t("journal.empty")}</p> : null}
      </div>

      <TradeExitModal
        trade={exitTrade}
        open={Boolean(exitTrade)}
        onClose={() => setExitTrade(null)}
        onSuccess={load}
      />
    </AppShell>
  );
}
