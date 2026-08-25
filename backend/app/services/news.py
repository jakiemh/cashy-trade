from datetime import datetime

import httpx

HEADERS = {"User-Agent": "CashyTrade/0.1"}


def get_news(symbol: str, limit: int = 5) -> list[dict]:
    symbol = symbol.upper()
    url = "https://query1.finance.yahoo.com/v1/finance/search"
    try:
        response = httpx.get(
            url,
            params={"q": symbol, "quotesCount": 0, "newsCount": limit},
            headers=HEADERS,
            timeout=10,
        )
        response.raise_for_status()
        items = response.json().get("news", [])[:limit]
        news = []
        for item in items:
            published = item.get("providerPublishTime")
            news.append(
                {
                    "title": item.get("title", ""),
                    "url": item.get("link", ""),
                    "publisher": item.get("publisher", ""),
                    "published_at": datetime.utcfromtimestamp(published).isoformat() if published else None,
                }
            )
        return news
    except Exception:
        return []
