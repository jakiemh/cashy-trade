from collections import defaultdict
from datetime import datetime

from sqlalchemy.orm import Session

from app.models import Signal, Trade


def _month_key(dt: datetime) -> str:
    return dt.strftime("%Y-%m")


def dashboard_stats(db: Session, user_id: int) -> dict:
    trades = db.query(Trade).filter(Trade.user_id == user_id).all()
    closed = [t for t in trades if t.status == "closed"]
    open_trades = [t for t in trades if t.status == "open"]
    wins = [t for t in closed if (t.pnl_usd or 0) > 0]

    total_pnl = sum(t.pnl_usd or 0 for t in closed)
    avg_pnl_pct = (
        sum(t.pnl_pct or 0 for t in closed) / len(closed) if closed else 0.0
    )
    win_rate = (len(wins) / len(closed) * 100) if closed else 0.0

    today = datetime.utcnow().date()
    signals_today = (
        db.query(Signal)
        .filter(Signal.type == "COMPRA")
        .all()
    )
    signals_today = [s for s in signals_today if s.timestamp.date() == today]

    taken_signal_ids = {
        t.signal_id for t in trades if t.signal_id is not None
    }
    signals_taken = len([s for s in signals_today if s.id in taken_signal_ids])
    conversion = (signals_taken / len(signals_today) * 100) if signals_today else 0.0

    return {
        "total_trades": len(trades),
        "open_trades": len(open_trades),
        "closed_trades": len(closed),
        "win_rate": round(win_rate, 1),
        "total_pnl_usd": round(total_pnl, 2),
        "avg_pnl_pct": round(avg_pnl_pct, 2),
        "signals_today": len(signals_today),
        "signals_taken": signals_taken,
        "signals_conversion_pct": round(conversion, 1),
    }


def equity_curve(db: Session, user_id: int) -> list[dict]:
    closed = (
        db.query(Trade)
        .filter(Trade.user_id == user_id, Trade.status == "closed", Trade.exit_at.isnot(None))
        .order_by(Trade.exit_at.asc())
        .all()
    )
    cumulative = 0.0
    points = []
    for trade in closed:
        pnl = trade.pnl_usd or 0.0
        cumulative += pnl
        points.append(
            {
                "date": trade.exit_at,
                "pnl_usd": round(pnl, 2),
                "cumulative_pnl_usd": round(cumulative, 2),
            }
        )
    return points


def monthly_dashboard(db: Session, user_id: int) -> list[dict]:
    trades = db.query(Trade).filter(Trade.user_id == user_id).all()
    taken_signal_ids = {t.signal_id for t in trades if t.signal_id is not None}

    compra_signals = db.query(Signal).filter(Signal.type == "COMPRA").all()
    signals_by_month: dict[str, set[int]] = defaultdict(set)
    for signal in compra_signals:
        signals_by_month[_month_key(signal.timestamp)].add(signal.id)

    trades_taken_by_month: dict[str, int] = defaultdict(int)
    for month, signal_ids in signals_by_month.items():
        trades_taken_by_month[month] = len(
            [signal_id for signal_id in signal_ids if signal_id in taken_signal_ids]
        )

    closed_by_month: dict[str, list[Trade]] = defaultdict(list)
    for trade in trades:
        if trade.status == "closed" and trade.exit_at is not None:
            closed_by_month[_month_key(trade.exit_at)].append(trade)

    all_months = sorted(
        set(signals_by_month.keys())
        | set(trades_taken_by_month.keys())
        | set(closed_by_month.keys())
    )

    points = []
    for month in all_months:
        signals_received = len(signals_by_month.get(month, set()))
        trades_taken = trades_taken_by_month.get(month, 0)
        conversion = (trades_taken / signals_received * 100) if signals_received else 0.0

        closed = closed_by_month.get(month, [])
        pnl_usd = sum(trade.pnl_usd or 0 for trade in closed)
        wins = len([trade for trade in closed if (trade.pnl_usd or 0) > 0])
        win_rate = (wins / len(closed) * 100) if closed else 0.0

        points.append(
            {
                "month": month,
                "signals_received": signals_received,
                "trades_taken": trades_taken,
                "conversion_pct": round(conversion, 1),
                "pnl_usd": round(pnl_usd, 2),
                "win_rate": round(win_rate, 1),
                "closed_trades": len(closed),
            }
        )

    return points
