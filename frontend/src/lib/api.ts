export type User = {
  id: number;
  email: string;
  name: string;
  locale: string;
  is_admin?: boolean;
};

export type Signal = {
  id: number;
  type: "COMPRA" | "CIERRE" | "AVISO" | string;
  symbol: string;
  timestamp: string;
  strategy?: string | null;
  setup_name?: string | null;
  entry_price?: number | null;
  stop_loss?: number | null;
  stop_pct?: number | null;
  take_profit?: number | null;
  tp_pct?: number | null;
  rr_ratio?: number | null;
  exit_price?: number | null;
  pnl_pct?: number | null;
  reason?: string | null;
  current_price?: number | null;
  distance_to_stop_pct?: number | null;
  is_active: boolean;
  open_signal_id?: number | null;
  taken_by_user: boolean;
};

export type Trade = {
  id: number;
  signal_id?: number | null;
  symbol: string;
  strategy?: string | null;
  setup_name?: string | null;
  entry_price: number;
  entry_qty: number;
  entry_at: string;
  stop_loss?: number | null;
  take_profit?: number | null;
  exit_price?: number | null;
  exit_at?: string | null;
  exit_reason?: string | null;
  pnl_usd?: number | null;
  pnl_pct?: number | null;
  status: "open" | "closed" | string;
  notes?: string | null;
};

export type DashboardStats = {
  total_trades: number;
  open_trades: number;
  closed_trades: number;
  win_rate: number;
  total_pnl_usd: number;
  avg_pnl_pct: number;
  signals_today: number;
  signals_taken: number;
  signals_conversion_pct: number;
};

export type EquityPoint = {
  date: string;
  pnl_usd: number;
  cumulative_pnl_usd: number;
};

export type AdminStats = {
  total_users: number;
  total_signals: number;
  total_trades: number;
  open_trades: number;
  signals_today: number;
};

export type AdminUser = {
  id: number;
  email: string;
  name: string;
  locale: string;
  is_admin: boolean;
  created_at: string;
  trade_count: number;
};

export type SignalFilters = {
  active_only?: boolean;
  signal_type?: string;
  symbol?: string;
  setup?: string;
  taken?: boolean;
  since?: string;
};

export type NewsItem = {
  title: string;
  url: string;
  publisher?: string | null;
  published_at?: string | null;
};

export type WatchlistItem = {
  id: number;
  symbol: string;
  name?: string | null;
  price?: number | null;
  change_pct?: number | null;
  currency?: string;
  exchange?: string | null;
  news?: NewsItem[];
};

function resolveApiUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
  if (process.env.NODE_ENV === "development") {
    return configured || "http://localhost:8001";
  }
  // In production, never call localhost from the browser (stale local .env.local).
  if (!configured || /localhost|127\.0\.0\.1/i.test(configured)) {
    return "";
  }
  return configured;
}

const API_URL = resolveApiUrl();

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cashy_token");
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("cashy_token", token);
  else localStorage.removeItem("cashy_token");
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed: ${response.status}`);
  }
  return response.json();
}

export const api = {
  register: (email: string, password: string, name = "") =>
    apiFetch<{ access_token: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),
  login: (email: string, password: string) =>
    apiFetch<{ access_token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => apiFetch<User>("/api/auth/me"),
  signals: (params?: SignalFilters) => {
    const query = new URLSearchParams();
    if (params?.active_only) query.set("active_only", "true");
    if (params?.signal_type) query.set("signal_type", params.signal_type);
    if (params?.symbol) query.set("symbol", params.symbol.toUpperCase());
    if (params?.setup) query.set("setup", params.setup);
    if (params?.taken != null) query.set("taken", params.taken ? "true" : "false");
    if (params?.since) query.set("since", params.since);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return apiFetch<Signal[]>(`/api/signals${suffix}`);
  },
  trades: (status?: string) => {
    const suffix = status ? `?status=${status}` : "";
    return apiFetch<Trade[]>(`/api/trades${suffix}`);
  },
  createTrade: (payload: Record<string, unknown>) =>
    apiFetch<Trade>("/api/trades", { method: "POST", body: JSON.stringify(payload) }),
  closeTrade: (tradeId: number, payload: Record<string, unknown>) =>
    apiFetch<Trade>(`/api/trades/${tradeId}/close`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  exportTrades: async () => {
    const token = getToken();
    const response = await fetch(`${API_URL}/api/trades/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `cashy_trades_${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  },
  matchCierreTrade: (cierreSignalId: number) =>
    apiFetch<{ trade: Trade | null; cierre_signal_id: number }>(
      `/api/trades/match-cierre/${cierreSignalId}`
    ),
  stats: () => apiFetch<DashboardStats>("/api/dashboard/stats"),
  equity: () => apiFetch<EquityPoint[]>("/api/dashboard/equity"),
  adminStats: () => apiFetch<AdminStats>("/api/admin/stats"),
  adminUsers: () => apiFetch<AdminUser[]>("/api/admin/users"),
  chat: (message: string) =>
    apiFetch<{ role: string; content: string; created_at: string }>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
  updateSettings: (payload: Record<string, unknown>) =>
    apiFetch<{ bot_name: string; bot_avatar_url?: string | null; locale: string }>(
      "/api/settings",
      { method: "PATCH", body: JSON.stringify(payload) }
    ),
  getSettings: () =>
    apiFetch<{ bot_name: string; bot_avatar_url?: string | null; locale: string }>(
      "/api/settings"
    ),
  watchlistEnriched: () => apiFetch<WatchlistItem[]>("/api/watchlist/enriched"),
  addWatchlist: (symbol: string) =>
    apiFetch<{ id: number; symbol: string }>("/api/watchlist", {
      method: "POST",
      body: JSON.stringify({ symbol }),
    }),
  removeWatchlist: (id: number) =>
    apiFetch<{ ok: boolean }>(`/api/watchlist/${id}`, { method: "DELETE" }),
  seedWatchlist: () =>
    apiFetch<{ added: number; symbols: string[] }>("/api/watchlist/seed-defaults", {
      method: "POST",
    }),
  marketNews: (symbol: string) => apiFetch<NewsItem[]>(`/api/market/news/${symbol}`),
  marketQuote: (symbol: string) =>
    apiFetch<{ symbol: string; name?: string; price?: number; change_pct?: number }>(
      `/api/market/quote/${symbol}`
    ),
};
