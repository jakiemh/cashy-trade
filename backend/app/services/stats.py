from datetime import datetime

from sqlalchemy.orm import Session

from app.models import Signal, Trade


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
