from datetime import datetime

from sqlalchemy.orm import Session

from app.models import Signal, Trade
from app.schemas import SignalIn


def _latest_open_signal(db: Session, symbol: str) -> Signal | None:
    return (
        db.query(Signal)
        .filter(Signal.symbol == symbol.upper(), Signal.type == "COMPRA", Signal.is_active.is_(True))
        .order_by(Signal.timestamp.desc())
        .first()
    )


def create_signal(db: Session, payload: SignalIn) -> Signal:
    symbol = payload.symbol.upper()
    timestamp = payload.timestamp or datetime.utcnow()
    signal = Signal(
        type=payload.type.upper(),
        symbol=symbol,
        timestamp=timestamp,
        strategy=payload.strategy,
        setup_name=payload.setup_name,
        entry_price=payload.entry_price,
        stop_loss=payload.stop_loss,
        stop_pct=payload.stop_pct,
        take_profit=payload.take_profit,
        tp_pct=payload.tp_pct,
        rr_ratio=payload.rr_ratio,
        exit_price=payload.exit_price,
        pnl_pct=payload.pnl_pct,
        reason=payload.reason,
        current_price=payload.current_price,
        distance_to_stop_pct=payload.distance_to_stop_pct,
        entry_qty=payload.entry_qty,
    )

    if signal.type == "COMPRA":
        signal.is_active = True
    elif signal.type == "CIERRE":
        open_signal = _latest_open_signal(db, symbol)
        if open_signal:
            open_signal.is_active = False
            signal.open_signal_id = open_signal.id
    elif signal.type == "AVISO":
        open_signal = _latest_open_signal(db, symbol)
        if open_signal:
            signal.open_signal_id = open_signal.id

    db.add(signal)
    db.commit()
    db.refresh(signal)
    return signal


def user_taken_signal_ids(db: Session, user_id: int, signal_ids: list[int]) -> set[int]:
    if not signal_ids:
        return set()
    rows = (
        db.query(Trade.signal_id)
        .filter(Trade.user_id == user_id, Trade.signal_id.in_(signal_ids))
        .all()
    )
    return {row[0] for row in rows if row[0] is not None}


def compute_trade_pnl(entry_price: float, entry_qty: float, exit_price: float) -> tuple[float, float]:
    pnl_usd = (exit_price - entry_price) * entry_qty
    pnl_pct = ((exit_price - entry_price) / entry_price * 100) if entry_price else 0.0
    return round(pnl_usd, 2), round(pnl_pct, 2)
