"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import TradeEntryModal from "@/components/TradeEntryModal";
import TradeExitModal from "@/components/TradeExitModal";
import { Badge, formatMoney, formatPct } from "@/components/ui";
import { useSignalPollingContext } from "@/contexts/SignalPollingContext";
import { useLocale } from "@/contexts/LocaleContext";
import { api, getToken, Signal, Trade } from "@/lib/api";

type ActiveFilter = "all" | "active";
type TakenFilter = "all" | "taken" | "not_taken";
type TypeFilter = "all" | "COMPRA" | "CIERRE" | "AVISO";

export default function SignalsPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [takenFilter, setTakenFilter] = useState<TakenFilter>("all");
  const [symbolFilter, setSymbolFilter] = useState("");
  const [setupFilter, setSetupFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [entrySignal, setEntrySignal] = useState<Signal | null>(null);
  const [exitTrade, setExitTrade] = useState<Trade | null>(null);
  const [exitDefaults, setExitDefaults] = useState<{ exit_price?: number | null; exit_reason?: string | null }>();
  const { notifyEnabled, enableNotifications, subscribe, wsConnected } = useSignalPollingContext();

  const queryParams = useMemo(() => {
    const params: Parameters<typeof api.signals>[0] = {};
    if (activeFilter === "active") params.active_only = true;
    if (typeFilter !== "all") params.signal_type = typeFilter;
    if (symbolFilter.trim()) params.symbol = symbolFilter.trim();
    if (setupFilter.trim()) params.setup = setupFilter.trim();
    if (takenFilter === "taken") params.taken = true;
    if (takenFilter === "not_taken") params.taken = false;
    return params;
  }, [activeFilter, typeFilter, symbolFilter, setupFilter, takenFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.signals(queryParams);
      setSignals(data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [queryParams, t]);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    load();
  }, [router, load]);

  useEffect(() => {
    return subscribe(() => {
      void load();
    });
  }, [subscribe, load]);

  async function toggleNotifications() {
    await enableNotifications();
  }

  async function openCierreExit(signal: Signal) {
    try {
      const match = await api.matchCierreTrade(signal.id);
      if (!match.trade) {
        setError(t("signals.noOpenTrade", { symbol: signal.symbol }));
        return;
      }
      setExitDefaults({
        exit_price: signal.exit_price,
        exit_reason: signal.reason || "Señal CIERRE del bot",
      });
      setExitTrade(match.trade);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al buscar trade");
    }
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-800 sm:text-2xl">{t("signals.title")}</h2>
          <p className="mt-1 text-sm text-muted">{t("signals.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs ${wsConnected ? "text-emerald-600" : "text-muted"}`}>
            {wsConnected ? t("signals.liveWs") : t("signals.livePoll")}
          </span>
          <button type="button" className="btn-secondary" onClick={() => load()} disabled={loading}>
            {loading ? t("common.updating") : t("common.refresh")}
          </button>
          <button
            type="button"
            className={notifyEnabled ? "nav-pill-active" : "nav-pill"}
            onClick={toggleNotifications}
          >
            {notifyEnabled ? t("signals.alertsOn") : t("signals.alerts")}
          </button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          className="input-field uppercase"
          placeholder={t("signals.filterTicker")}
          value={symbolFilter}
          onChange={(e) => setSymbolFilter(e.target.value)}
        />
        <input
          className="input-field"
          placeholder={t("signals.filterSetup")}
          value={setupFilter}
          onChange={(e) => setSetupFilter(e.target.value)}
        />
        <select
          className="input-field"
          value={takenFilter}
          onChange={(e) => setTakenFilter(e.target.value as TakenFilter)}
        >
          <option value="all">{t("signals.takenAll")}</option>
          <option value="taken">{t("signals.takenOnly")}</option>
          <option value="not_taken">{t("signals.notTaken")}</option>
        </select>
        <select
          className="input-field"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
        >
          <option value="all">{t("signals.typeAll")}</option>
          <option value="COMPRA">COMPRA</option>
          <option value="CIERRE">CIERRE</option>
          <option value="AVISO">AVISO</option>
        </select>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={activeFilter === "all" ? "nav-pill-active" : "nav-pill"}
          onClick={() => setActiveFilter("all")}
        >
          {t("common.all")}
        </button>
        <button
          type="button"
          className={activeFilter === "active" ? "nav-pill-active" : "nav-pill"}
          onClick={() => setActiveFilter("active")}
        >
          {t("common.active")}
        </button>
      </div>

      {error ? <p className="mb-4 text-rose-600">{error}</p> : null}

      <div className="space-y-4">
        {signals.map((signal) => (
          <div key={signal.id} className="glass-card">
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                tone={
                  signal.type === "COMPRA"
                    ? "good"
                    : signal.type === "CIERRE"
                      ? signal.pnl_pct && signal.pnl_pct >= 0
                        ? "good"
                        : "bad"
                      : "warn"
                }
              >
                {signal.type}
              </Badge>
              <h3 className="text-lg font-semibold text-slate-800">{signal.symbol}</h3>
              <span className="text-sm text-muted">{new Date(signal.timestamp).toLocaleString()}</span>
              {signal.taken_by_user ? <Badge tone="neutral">{t("common.taken")}</Badge> : null}
              {signal.is_active ? <Badge tone="good">{t("common.active")}</Badge> : null}
            </div>
            {signal.type === "COMPRA" ? (
              <div className="mt-4 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                <p>{t("signals.entry")}: {formatMoney(signal.entry_price)}</p>
                <p>Stop: {formatMoney(signal.stop_loss)} ({formatPct(signal.stop_pct)})</p>
                <p>Objetivo: {formatMoney(signal.take_profit)} ({formatPct(signal.tp_pct)})</p>
                <p>R:R {signal.rr_ratio}:1</p>
                <p className="md:col-span-2">Setup: {signal.setup_name || signal.strategy}</p>
              </div>
            ) : null}
            {signal.type === "CIERRE" ? (
              <div className="mt-4 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                <p>{t("signals.exit")}: {formatMoney(signal.exit_price)}</p>
                <p>{t("signals.result")}: {formatPct(signal.pnl_pct)}</p>
                <p>Motivo: {signal.reason}</p>
              </div>
            ) : null}
            {signal.type === "AVISO" ? (
              <div className="mt-4 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                <p>{t("signals.now")}: {formatMoney(signal.current_price)}</p>
                <p>Stop: {formatMoney(signal.stop_loss)} (a {signal.distance_to_stop_pct}% del stop)</p>
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {signal.type === "COMPRA" && !signal.taken_by_user ? (
                <button type="button" className="btn-primary" onClick={() => setEntrySignal(signal)}>
                  {t("signals.registerTrade")}
                </button>
              ) : null}
              {signal.type === "CIERRE" ? (
                <button type="button" className="btn-secondary" onClick={() => openCierreExit(signal)}>
                  {t("signals.closeInJournal")}
                </button>
              ) : null}
            </div>
          </div>
        ))}
        {!loading && !signals.length ? <p className="text-muted">{t("signals.empty")}</p> : null}
      </div>

      <TradeEntryModal
        signal={entrySignal}
        open={Boolean(entrySignal)}
        onClose={() => setEntrySignal(null)}
        onSuccess={load}
      />

      <TradeExitModal
        trade={exitTrade}
        defaults={exitDefaults}
        open={Boolean(exitTrade)}
        onClose={() => {
          setExitTrade(null);
          setExitDefaults(undefined);
        }}
        onSuccess={load}
      />
    </AppShell>
  );
}
