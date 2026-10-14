"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import ManualTradeModal from "@/components/ManualTradeModal";
import TradeExitModal from "@/components/TradeExitModal";
import TradeEditModal from "@/components/TradeEditModal";
import { Badge, formatMoney, formatPct, PageHeader } from "@/components/ui";
import { useLocale } from "@/contexts/LocaleContext";
import { api, formatOptionLabel, getToken, Trade } from "@/lib/api";

export default function JournalPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [exitTrade, setExitTrade] = useState<Trade | null>(null);
  const [editTrade, setEditTrade] = useState<Trade | null>(null);
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
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={() => setManualOpen(true)}>
            {t("journal.addTrade")}
          </button>
          <button type="button" className="btn-secondary" onClick={exportCsv} disabled={exporting}>
            {exporting ? t("journal.exporting") : t("journal.exportCsv")}
          </button>
        </div>
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
        {filtered.map((trade) => {
          const isOption = trade.instrument_type === "option";
          const title = isOption ? formatOptionLabel(trade) : trade.symbol;
          const qtyUnit = isOption ? t("journal.contracts") : t("journal.shares");
          return (
          <div key={trade.id} className="glass-card">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
              <Badge tone={trade.status === "open" ? "warn" : trade.pnl_pct && trade.pnl_pct >= 0 ? "good" : "bad"}>
                {trade.status === "open" ? t("common.open") : t("common.closed")}
              </Badge>
              {isOption ? (
                <Badge tone="neutral">{t("trade.instrumentOption")}</Badge>
              ) : null}
              <Badge tone={trade.account_type === "paper" ? "neutral" : "good"}>
                {trade.account_type === "paper" ? t("trade.accountPaper") : t("trade.accountReal")}
              </Badge>
              <span className="text-sm text-muted">{new Date(trade.entry_at).toLocaleString()}</span>
            </div>
            <div className="mt-4 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
              {isOption ? (
                <>
                  <p>
                    {t("trade.contracts")}: {trade.entry_qty}
                  </p>
                  <p>
                    {t("trade.strike")}: {formatMoney(trade.strike)}
                  </p>
                  <p>
                    {t("trade.expiration")}: {trade.expiration ? String(trade.expiration).slice(0, 10) : "-"}
                  </p>
                  <p>
                    {t("trade.buyPrice")}: {formatMoney(trade.entry_price)}
                  </p>
                </>
              ) : (
                <>
                  <p>
                    {t("journal.entry")}: {formatMoney(trade.entry_price)} x {trade.entry_qty} {qtyUnit}
                  </p>
                  <p>
                    {t("journal.stop")}: {formatMoney(trade.stop_loss)}
                  </p>
                  <p>
                    {t("journal.target")}: {formatMoney(trade.take_profit)}
                  </p>
                </>
              )}
              <p>
                {t("journal.setup")}: {trade.setup_name || trade.strategy || "-"}
              </p>
              {trade.status === "closed" ? (
                <>
                  <p>
                    {isOption ? t("trade.sellPrice") : t("journal.exit")}: {formatMoney(trade.exit_price)}
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
                <button type="button" className="btn-secondary" onClick={() => setEditTrade(trade)}>
                  {t("journal.editTrade")}
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
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="btn-secondary" onClick={() => setEditTrade(trade)}>
                  {t("journal.editTrade")}
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
            )}
          </div>
          );
        })}
        {!filtered.length ? <p className="text-muted">{t("journal.empty")}</p> : null}
      </div>

      <ManualTradeModal open={manualOpen} onClose={() => setManualOpen(false)} onSuccess={load} />
      <TradeExitModal
        trade={exitTrade}
        open={Boolean(exitTrade)}
        onClose={() => setExitTrade(null)}
        onSuccess={load}
      />
      <TradeEditModal
        trade={editTrade}
        open={Boolean(editTrade)}
        onClose={() => setEditTrade(null)}
        onSuccess={load}
      />
    </AppShell>
  );
}
