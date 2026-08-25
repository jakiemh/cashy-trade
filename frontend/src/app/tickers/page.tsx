"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { Badge, formatMoney, formatPct, PageHeader } from "@/components/ui";
import { useLocale } from "@/contexts/LocaleContext";
import { api, getToken, WatchlistItem } from "@/lib/api";

function chartSymbol(symbol: string) {
  return encodeURIComponent(symbol);
}

export default function TickersPage() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [symbol, setSymbol] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await api.watchlistEnriched();
      setItems(data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    load();
  }, [router, load]);

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    const value = symbol.trim().toUpperCase();
    if (!value) return;
    await api.addWatchlist(value);
    setSymbol("");
    await load();
  }

  async function onRemove(id: number) {
    await api.removeWatchlist(id);
    if (selected && items.find((i) => i.id === id)?.symbol === selected) {
      setSelected(null);
    }
    await load();
  }

  async function onSeed() {
    await api.seedWatchlist();
    await load();
  }

  return (
    <AppShell>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <PageHeader title={t("tickers.title")} subtitle={t("tickers.subtitle")} />
        <button type="button" className="btn-secondary" disabled={refreshing} onClick={() => load()}>
          {refreshing ? t("common.updating") : t("common.refresh")}
        </button>
      </div>

      <form className="mb-4 flex gap-2" onSubmit={onAdd}>
        <input
          className="input-field min-w-0 flex-1 uppercase"
          placeholder={t("tickers.addPlaceholder")}
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
        />
        <button type="submit" className="btn-primary shrink-0">
          {t("common.add")}
        </button>
      </form>

      {error ? <p className="mb-4 text-sm text-rose-600">{error}</p> : null}

      {loading ? (
        <p className="text-muted">{t("tickers.loading")}</p>
      ) : items.length === 0 ? (
        <div className="glass-card text-center">
          <p className="text-slate-700">{t("tickers.empty")}</p>
          <button type="button" className="btn-primary mt-4" onClick={onSeed}>
            {t("tickers.seedDefaults")}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isUp = (item.change_pct ?? 0) >= 0;
            const isSelected = selected === item.symbol;
            return (
              <div
                key={item.id}
                className={`glass-card-sm overflow-hidden transition ${
                  isSelected ? "ring-2 ring-emerald-300" : ""
                }`}
              >
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-3 p-4 text-left"
                  onClick={() => setSelected(isSelected ? null : item.symbol)}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-800">{item.symbol}</h3>
                      {item.exchange ? <Badge tone="neutral">{item.exchange}</Badge> : null}
                    </div>
                    {item.name ? <p className="truncate text-sm text-muted">{item.name}</p> : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-semibold text-slate-800">{formatMoney(item.price)}</p>
                    <p className={`text-sm font-medium ${isUp ? "text-emerald-600" : "text-rose-600"}`}>
                      {formatPct(item.change_pct)}
                    </p>
                  </div>
                </button>

                {isSelected ? (
                  <div className="border-t border-emerald-100 px-4 pb-4">
                    <div className="mt-3 overflow-hidden rounded-xl border border-emerald-100 bg-white">
                      <iframe
                        title={`Chart ${item.symbol}`}
                        className="h-56 w-full sm:h-72"
                        src={`https://s.tradingview.com/widgetembed/?symbol=${chartSymbol(item.symbol)}&interval=D&theme=light&style=1&locale=${locale}&hide_top_toolbar=1&hide_legend=0&allow_symbol_change=0`}
                        loading="lazy"
                      />
                    </div>

                    <div className="mt-4">
                      <h4 className="mb-2 text-sm font-medium text-slate-700">{t("tickers.recentNews")}</h4>
                      {item.news?.length ? (
                        <ul className="space-y-2">
                          {item.news.map((news) => (
                            <li key={news.url}>
                              <a
                                href={news.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block rounded-xl border border-emerald-100 bg-white/90 px-3 py-2 text-sm shadow-sm hover:border-emerald-200"
                              >
                                <p className="font-medium text-slate-800">{news.title}</p>
                                {news.publisher ? (
                                  <p className="mt-1 text-xs text-slate-500">{news.publisher}</p>
                                ) : null}
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted">{t("tickers.noNews")}</p>
                      )}
                    </div>

                    <button
                      type="button"
                      className="mt-4 rounded-xl border border-rose-200 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                      onClick={() => onRemove(item.id)}
                    >
                      {t("tickers.remove")}
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
