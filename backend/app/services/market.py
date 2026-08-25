import httpx

HEADERS = {"User-Agent": "CashyTrade/0.1"}

# Mismo universo base que Tradingbot_activos/config.py
DEFAULT_UNIVERSE = [
    "SPY", "QQQ", "IWM", "DIA", "AAPL", "MSFT", "TSLA", "NVDA", "AMZN", "META", "PLTR",
]


def get_quote(symbol: str) -> dict:
    symbol = symbol.upper()
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
    try:
        response = httpx.get(
            url,
            params={"interval": "1d", "range": "2d"},
            headers=HEADERS,
            timeout=10,
        )
        response.raise_for_status()
        payload = response.json()
        result = payload["chart"]["result"][0]
        meta = result["meta"]
        price = meta.get("regularMarketPrice") or meta.get("previousClose")
        prev = meta.get("chartPreviousClose") or meta.get("previousClose")
        change_pct = None
        if price is not None and prev:
            change_pct = round((price - prev) / prev * 100, 2)
        return {
            "symbol": symbol,
            "name": meta.get("shortName") or meta.get("longName") or symbol,
            "price": round(float(price), 2) if price is not None else None,
            "change_pct": change_pct,
            "currency": meta.get("currency", "USD"),
            "exchange": meta.get("exchangeName") or meta.get("fullExchangeName"),
        }
    except Exception:
        return {
            "symbol": symbol,
            "name": symbol,
            "price": None,
            "change_pct": None,
            "currency": "USD",
            "exchange": None,
        }
