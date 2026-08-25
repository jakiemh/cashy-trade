import re
from datetime import datetime

from sqlalchemy.orm import Session

from app.models import ChatMessage, Signal, Trade
from app.services.market import get_quote
from app.services.news import get_news
from app.services.stats import dashboard_stats

INTENTS = [
    {
        "name": "help",
        "patterns": [r"^ayuda$", r"^help$", r"comandos"],
        "handler": "help",
    },
    {
        "name": "win_rate",
        "patterns": [r"win\s*rate", r"tasa\s*de\s*acierto", r"%\s*acierto"],
        "handler": "win_rate",
    },
    {
        "name": "signals_today",
        "patterns": [r"señales?\s+hoy", r"signals?\s+today"],
        "handler": "signals_today",
    },
    {
        "name": "last_signal",
        "patterns": [r"última\s+señal", r"ultima\s+senal", r"last\s+signal"],
        "handler": "last_signal",
    },
    {
        "name": "open_trades",
        "patterns": [r"trades?\s+abiertos?", r"operaciones?\s+abiertas?", r"open\s+trades?"],
        "handler": "open_trades",
    },
    {
        "name": "price",
        "patterns": [r"precio\s+([A-Za-z]{1,10})", r"([A-Za-z]{1,10})\s+price"],
        "handler": "price",
    },
    {
        "name": "news",
        "patterns": [r"noticias?\s+([A-Za-z]{1,10})", r"([A-Za-z]{1,10})\s+news"],
        "handler": "news",
    },
    {
        "name": "stats",
        "patterns": [r"stats?", r"estadísticas?", r"estadisticas?", r"dashboard"],
        "handler": "stats",
    },
    {
        "name": "pnl_today",
        "patterns": [r"pnl\s*hoy", r"p&l\s*hoy", r"ganancia\s*hoy", r"p&l\s*today", r"pnl\s*today"],
        "handler": "pnl_today",
    },
    {
        "name": "signals_symbol",
        "patterns": [r"señales?\s+([A-Za-z]{1,10})", r"signals?\s+([A-Za-z]{1,10})"],
        "handler": "signals_symbol",
    },
    {
        "name": "last_trades",
        "patterns": [r"últimos?\s+trades?", r"ultimos?\s+trades?", r"last\s+trades?", r"bitácora\s+reciente"],
        "handler": "last_trades",
    },
    {
        "name": "journal_symbol",
        "patterns": [r"bitácora\s+([A-Za-z]{1,10})", r"bitacora\s+([A-Za-z]{1,10})", r"journal\s+([A-Za-z]{1,10})"],
        "handler": "journal_symbol",
    },
]


_ES_HINTS = [
    r"noticias?",
    r"señales?",
    r"senal",
    r"última",
    r"ultima",
    r"\bayuda\b",
    r"precio",
    r"estadísticas?",
    r"estadisticas?",
    r"operaciones?",
    r"tasa\s*de\s*acierto",
    r"cuánt",
    r"cuant",
    r"hola",
    r"qué",
    r"cuáles?",
    r"cuales?",
    r"trades?\s+abiertos?",
    r"cómo",
    r"como\s",
]
_EN_HINTS = [
    r"\bnews\b",
    r"\bsignals?\s+today\b",
    r"\bhelp\b",
    r"\bprice\b",
    r"last\s+signal",
    r"open\s+trades?",
    r"\bstats?\b",
    r"win\s*rate",
    r"\btoday\b",
    r"\bhow\b",
    r"\bwhat\b",
]


def _resolve_locale(message: str, user_locale: str) -> str:
    text = message.strip().lower()
    es_score = sum(1 for pattern in _ES_HINTS if re.search(pattern, text, re.I))
    en_score = sum(1 for pattern in _EN_HINTS if re.search(pattern, text, re.I))
    if es_score > en_score:
        return "es"
    if en_score > es_score:
        return "en"
    fallback = (user_locale or "es").lower()
    return "en" if fallback.startswith("en") else "es"


def _match_intent(message: str) -> tuple[str, re.Match | None]:
    text = message.strip().lower()
    for intent in INTENTS:
        for pattern in intent["patterns"]:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return intent["handler"], match
    return "fallback", None


def _t(locale: str, es: str, en: str) -> str:
    return en if locale == "en" else es


def process_message(db: Session, user_id: int, locale: str, message: str) -> str:
    locale = _resolve_locale(message, locale)
    handler, match = _match_intent(message)

    if handler == "help":
        if locale == "en":
            return (
                "Hi, I'm Cashy. Try:\n"
                "- win rate\n"
                "- signals today\n"
                "- last signal\n"
                "- open trades\n"
                "- precio AAPL\n"
                "- noticias NVDA\n"
                "- stats\n"
                "- pnl hoy\n"
                "- señales MSFT\n"
                "- últimos trades\n"
                "- bitácora AAPL"
            )
        return (
            "Hola, soy Cashy. Prueba:\n"
            "- win rate\n"
            "- señales hoy\n"
            "- última señal\n"
            "- trades abiertos\n"
            "- precio AAPL\n"
            "- noticias NVDA\n"
            "- stats\n"
            "- pnl hoy\n"
            "- señales MSFT\n"
            "- últimos trades\n"
            "- bitácora AAPL"
        )

    if handler == "win_rate":
        stats = dashboard_stats(db, user_id)
        return _t(
            locale,
            f"Tu win rate es {stats['win_rate']}% en {stats['closed_trades']} trades cerrados.",
            f"Your win rate is {stats['win_rate']}% across {stats['closed_trades']} closed trades.",
        )

    if handler == "signals_today":
        today = datetime.utcnow().date()
        signals = (
            db.query(Signal)
            .filter(Signal.type == "COMPRA")
            .order_by(Signal.timestamp.desc())
            .all()
        )
        today_signals = [s for s in signals if s.timestamp.date() == today]
        if not today_signals:
            return _t(locale, "No hay señales COMPRA hoy.", "No COMPRA signals today.")
        lines = [
            f"- {s.symbol} @ ${s.entry_price:.2f} ({s.setup_name or s.strategy})"
            for s in today_signals[:10]
        ]
        header = _t(locale, f"Señales de hoy ({len(today_signals)}):", f"Today's signals ({len(today_signals)}):")
        return header + "\n" + "\n".join(lines)

    if handler == "last_signal":
        signal = db.query(Signal).order_by(Signal.timestamp.desc()).first()
        if not signal:
            return _t(locale, "Aún no hay señales registradas.", "No signals recorded yet.")
        if signal.type == "COMPRA":
            return _t(
                locale,
                f"Última señal: COMPRA {signal.symbol} @ ${signal.entry_price:.2f}, stop ${signal.stop_loss:.2f}, objetivo ${signal.take_profit:.2f}.",
                f"Last signal: BUY {signal.symbol} @ ${signal.entry_price:.2f}, stop ${signal.stop_loss:.2f}, target ${signal.take_profit:.2f}.",
            )
        if signal.type == "CIERRE":
            return _t(
                locale,
                f"Última señal: CIERRE {signal.symbol} @ ${signal.exit_price:.2f} ({signal.pnl_pct:+.1f}%).",
                f"Last signal: CLOSE {signal.symbol} @ ${signal.exit_price:.2f} ({signal.pnl_pct:+.1f}%).",
            )
        return _t(
            locale,
            f"Última señal: AVISO {signal.symbol}, precio ${signal.current_price:.2f}, stop ${signal.stop_loss:.2f}.",
            f"Last signal: WARNING {signal.symbol}, price ${signal.current_price:.2f}, stop ${signal.stop_loss:.2f}.",
        )

    if handler == "open_trades":
        trades = (
            db.query(Trade)
            .filter(Trade.user_id == user_id, Trade.status == "open")
            .order_by(Trade.entry_at.desc())
            .all()
        )
        if not trades:
            return _t(locale, "No tienes trades abiertos.", "You have no open trades.")
        lines = [
            f"- {t.symbol}: {t.entry_qty:g} @ ${t.entry_price:.2f}"
            for t in trades
        ]
        header = _t(locale, f"Trades abiertos ({len(trades)}):", f"Open trades ({len(trades)}):")
        return header + "\n" + "\n".join(lines)

    if handler == "price" and match:
        symbol = match.group(1).upper()
        quote = get_quote(symbol)
        if quote["price"] is None:
            return _t(locale, f"No pude obtener precio de {symbol}.", f"Could not fetch price for {symbol}.")
        change = quote["change_pct"]
        change_txt = f" ({change:+.2f}%)" if change is not None else ""
        return _t(
            locale,
            f"{symbol}: ${quote['price']:.2f}{change_txt}",
            f"{symbol}: ${quote['price']:.2f}{change_txt}",
        )

    if handler == "news" and match:
        symbol = match.group(1).upper()
        items = get_news(symbol, limit=3)
        if not items:
            return _t(locale, f"No hay noticias recientes de {symbol}.", f"No recent news for {symbol}.")
        lines = [f"- {n['title']}" + (f" ({n['publisher']})" if n.get("publisher") else "") for n in items]
        header = _t(locale, f"Noticias de {symbol}:", f"News for {symbol}:")
        return header + "\n" + "\n".join(lines)

    if handler == "stats":
        stats = dashboard_stats(db, user_id)
        if locale == "en":
            return (
                f"Stats:\n"
                f"- Closed trades: {stats['closed_trades']}\n"
                f"- Win rate: {stats['win_rate']}%\n"
                f"- Total P&L: ${stats['total_pnl_usd']:.2f}\n"
                f"- Open trades: {stats['open_trades']}\n"
                f"- Signals today: {stats['signals_today']}"
            )
        return (
            f"Estadísticas:\n"
            f"- Trades cerrados: {stats['closed_trades']}\n"
            f"- Win rate: {stats['win_rate']}%\n"
            f"- P&L total: ${stats['total_pnl_usd']:.2f}\n"
            f"- Trades abiertos: {stats['open_trades']}\n"
            f"- Señales hoy: {stats['signals_today']}"
        )

    if handler == "pnl_today":
        today = datetime.utcnow().date()
        closed_today = (
            db.query(Trade)
            .filter(
                Trade.user_id == user_id,
                Trade.status == "closed",
                Trade.exit_at.isnot(None),
            )
            .all()
        )
        closed_today = [t for t in closed_today if t.exit_at.date() == today]
        pnl = sum(t.pnl_usd or 0 for t in closed_today)
        return _t(
            locale,
            f"P&L de hoy: ${pnl:.2f} en {len(closed_today)} trade(s) cerrado(s).",
            f"Today's P&L: ${pnl:.2f} across {len(closed_today)} closed trade(s).",
        )

    if handler == "signals_symbol" and match:
        symbol = match.group(1).upper()
        rows = (
            db.query(Signal)
            .filter(Signal.symbol == symbol)
            .order_by(Signal.timestamp.desc())
            .limit(8)
            .all()
        )
        if not rows:
            return _t(locale, f"No hay señales de {symbol}.", f"No signals for {symbol}.")
        lines = [f"- [{s.type}] {s.timestamp.strftime('%Y-%m-%d %H:%M')}" for s in rows]
        header = _t(locale, f"Señales de {symbol}:", f"Signals for {symbol}:")
        return header + "\n" + "\n".join(lines)

    if handler == "last_trades":
        trades = (
            db.query(Trade)
            .filter(Trade.user_id == user_id)
            .order_by(Trade.entry_at.desc())
            .limit(5)
            .all()
        )
        if not trades:
            return _t(locale, "No tienes trades en la bitácora.", "No trades in your journal.")
        lines = []
        for t in trades:
            status = t.status.upper()
            pnl = f" | P&L ${t.pnl_usd:.2f}" if t.status == "closed" and t.pnl_usd is not None else ""
            lines.append(f"- {t.symbol} {status} @ ${t.entry_price:.2f}{pnl}")
        header = _t(locale, "Últimos trades:", "Recent trades:")
        return header + "\n" + "\n".join(lines)

    if handler == "journal_symbol" and match:
        symbol = match.group(1).upper()
        trades = (
            db.query(Trade)
            .filter(Trade.user_id == user_id, Trade.symbol == symbol)
            .order_by(Trade.entry_at.desc())
            .limit(8)
            .all()
        )
        if not trades:
            return _t(locale, f"No tienes trades de {symbol}.", f"No trades for {symbol}.")
        lines = []
        for t in trades:
            if t.status == "closed":
                lines.append(
                    f"- {t.entry_at.strftime('%Y-%m-%d')}: ${t.entry_price:.2f} → ${t.exit_price:.2f} ({(t.pnl_pct or 0):+.1f}%)"
                )
            else:
                lines.append(f"- ABIERTO {t.entry_at.strftime('%Y-%m-%d')}: ${t.entry_price:.2f} x {t.entry_qty:g}")
        header = _t(locale, f"Bitácora {symbol}:", f"Journal {symbol}:")
        return header + "\n" + "\n".join(lines)

    return _t(
        locale,
        "No entendí eso. Escribe 'ayuda' para ver comandos.",
        "I didn't understand that. Type 'help' to see commands.",
    )


def save_chat_exchange(db: Session, user_id: int, user_message: str, assistant_message: str) -> None:
    db.add(ChatMessage(user_id=user_id, role="user", content=user_message))
    db.add(ChatMessage(user_id=user_id, role="assistant", content=assistant_message))
    db.commit()
