from collections import defaultdict
from datetime import date, datetime, time, timedelta
from typing import Callable

from sqlalchemy.orm import Session

from app.models import Signal, Trade


def _month_key(dt: datetime) -> str:
    return dt.strftime("%Y-%m")


def _iso_week_key(dt: datetime) -> str:
    iso = dt.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


def _parse_inclusive_range(
    from_date: date | None, to_date: date | None
) -> tuple[datetime | None, datetime | None]:
    start = datetime.combine(from_date, time.min) if from_date else None
    end = datetime.combine(to_date, time.max) if to_date else None
    return start, end


def _in_range(dt: datetime | None, start: datetime | None, end: datetime | None) -> bool:
    if dt is None:
        return False
    if start and dt < start:
        return False
    if end and dt > end:
        return False
    return True


def _trade_query(db: Session, user_id: int, account_type: str | None = None):
    query = db.query(Trade).filter(Trade.user_id == user_id)
    if account_type and account_type != "all":
        query = query.filter(Trade.account_type == account_type)
    return query


def dashboard_stats(
    db: Session,
    user_id: int,
    account_type: str | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
) -> dict:
    trades = _trade_query(db, user_id, account_type).all()
    range_start, range_end = _parse_inclusive_range(from_date, to_date)
    has_range = range_start is not None or range_end is not None

    closed = [t for t in trades if t.status == "closed"]
    if has_range:
        closed = [
            t
            for t in closed
            if t.exit_at is not None and _in_range(t.exit_at, range_start, range_end)
        ]

    open_trades = [t for t in trades if t.status == "open"]
    wins = [t for t in closed if (t.pnl_usd or 0) > 0]

    total_pnl = sum(t.pnl_usd or 0 for t in closed)
    avg_pnl_pct = sum(t.pnl_pct or 0 for t in closed) / len(closed) if closed else 0.0
    win_rate = (len(wins) / len(closed) * 100) if closed else 0.0

    compra_signals = db.query(Signal).filter(Signal.type == "COMPRA").all()
    if has_range:
        period_signals = [
            s
            for s in compra_signals
            if _in_range(s.timestamp, range_start, range_end)
        ]
    else:
        today = datetime.utcnow().date()
        period_signals = [s for s in compra_signals if s.timestamp.date() == today]

    taken_signal_ids = {t.signal_id for t in trades if t.signal_id is not None}
    signals_taken = len([s for s in period_signals if s.id in taken_signal_ids])
    conversion = (signals_taken / len(period_signals) * 100) if period_signals else 0.0

    total_trades = len(closed) + len(open_trades) if has_range else len(trades)

    return {
        "total_trades": total_trades,
        "open_trades": len(open_trades),
        "closed_trades": len(closed),
        "win_rate": round(win_rate, 1),
        "total_pnl_usd": round(total_pnl, 2),
        "avg_pnl_pct": round(avg_pnl_pct, 2),
        "signals_today": len(period_signals),
        "signals_taken": signals_taken,
        "signals_conversion_pct": round(conversion, 1),
    }


def equity_curve(
    db: Session,
    user_id: int,
    account_type: str | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
) -> list[dict]:
    closed = (
        _trade_query(db, user_id, account_type)
        .filter(Trade.status == "closed", Trade.exit_at.isnot(None))
        .order_by(Trade.exit_at.asc())
        .all()
    )
    range_start, range_end = _parse_inclusive_range(from_date, to_date)
    if range_start or range_end:
        closed = [t for t in closed if _in_range(t.exit_at, range_start, range_end)]

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


def _period_in_range(period_key: str, from_date: date | None, to_date: date | None) -> bool:
    if not from_date and not to_date:
        return True
    start = datetime.strptime(f"{period_key}-01", "%Y-%m-%d").date() if len(period_key) == 7 else None
    if start is not None:
        if start.month == 12:
            end = date(start.year + 1, 1, 1) - timedelta(days=1)
        else:
            end = date(start.year, start.month + 1, 1) - timedelta(days=1)
        period_start, period_end = start, end
    else:
        year_str, week_str = period_key.split("-W")
        year, week = int(year_str), int(week_str)
        period_start = date.fromisocalendar(year, week, 1)
        period_end = date.fromisocalendar(year, week, 7)

    if from_date and period_end < from_date:
        return False
    if to_date and period_start > to_date:
        return False
    return True


def _period_dashboard(
    db: Session,
    user_id: int,
    account_type: str | None,
    period_key_fn: Callable[[datetime], str],
    period_field: str,
    from_date: date | None = None,
    to_date: date | None = None,
) -> list[dict]:
    trades = _trade_query(db, user_id, account_type).all()
    taken_signal_ids = {t.signal_id for t in trades if t.signal_id is not None}

    compra_signals = db.query(Signal).filter(Signal.type == "COMPRA").all()
    signals_by_period: dict[str, set[int]] = defaultdict(set)
    for signal in compra_signals:
        key = period_key_fn(signal.timestamp)
        if _period_in_range(key, from_date, to_date):
            signals_by_period[key].add(signal.id)

    trades_taken_by_period: dict[str, int] = defaultdict(int)
    for period, signal_ids in signals_by_period.items():
        trades_taken_by_period[period] = len(
            [signal_id for signal_id in signal_ids if signal_id in taken_signal_ids]
        )

    closed_by_period: dict[str, list[Trade]] = defaultdict(list)
    for trade in trades:
        if trade.status == "closed" and trade.exit_at is not None:
            key = period_key_fn(trade.exit_at)
            if _period_in_range(key, from_date, to_date):
                closed_by_period[key].append(trade)

    all_periods = sorted(
        set(signals_by_period.keys())
        | set(trades_taken_by_period.keys())
        | set(closed_by_period.keys())
    )

    points = []
    for period in all_periods:
        signals_received = len(signals_by_period.get(period, set()))
        trades_taken = trades_taken_by_period.get(period, 0)
        conversion = (trades_taken / signals_received * 100) if signals_received else 0.0

        closed = closed_by_period.get(period, [])
        pnl_usd = sum(trade.pnl_usd or 0 for trade in closed)
        wins = len([trade for trade in closed if (trade.pnl_usd or 0) > 0])
        win_rate = (wins / len(closed) * 100) if closed else 0.0

        points.append(
            {
                period_field: period,
                "signals_received": signals_received,
                "trades_taken": trades_taken,
                "conversion_pct": round(conversion, 1),
                "pnl_usd": round(pnl_usd, 2),
                "win_rate": round(win_rate, 1),
                "closed_trades": len(closed),
            }
        )

    return points


def monthly_dashboard(
    db: Session,
    user_id: int,
    account_type: str | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
) -> list[dict]:
    return _period_dashboard(
        db,
        user_id,
        account_type,
        _month_key,
        "month",
        from_date,
        to_date,
    )


def weekly_dashboard(
    db: Session,
    user_id: int,
    account_type: str | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
) -> list[dict]:
    return _period_dashboard(
        db,
        user_id,
        account_type,
        _iso_week_key,
        "week",
        from_date,
        to_date,
    )
