from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_admin_user
from app.models import Signal, Trade, User
from app.schemas import AdminStatsOut, AdminUserOut, SignalOut

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats", response_model=AdminStatsOut)
def admin_stats(user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    today = datetime.utcnow().date()
    signals_today = len(
        [signal for signal in db.query(Signal).all() if signal.timestamp.date() == today]
    )
    return AdminStatsOut(
        total_users=db.query(User).count(),
        total_signals=db.query(Signal).count(),
        total_trades=db.query(Trade).count(),
        open_trades=db.query(Trade).filter(Trade.status == "open").count(),
        signals_today=signals_today,
    )


@router.get("/users", response_model=list[AdminUserOut])
def admin_users(user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    result = []
    for item in users:
        trade_count = db.query(Trade).filter(Trade.user_id == item.id).count()
        result.append(
            AdminUserOut(
                id=item.id,
                email=item.email,
                name=item.name,
                locale=item.locale,
                is_admin=item.is_admin,
                created_at=item.created_at,
                trade_count=trade_count,
            )
        )
    return result


@router.get("/signals", response_model=list[SignalOut])
def admin_signals(
    user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
    limit: int = Query(default=100, le=500),
):
    signals = db.query(Signal).order_by(Signal.timestamp.desc()).limit(limit).all()
    return [
        SignalOut.model_validate({**SignalOut.model_validate(signal).model_dump(), "taken_by_user": False})
        for signal in signals
    ]


@router.delete("/signals/{signal_id}")
def delete_signal(
    signal_id: int,
    user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    signal = db.query(Signal).filter(Signal.id == signal_id).first()
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")

    deleted_trade_ids: set[int] = set()
    deleted_signal_ids: set[int] = set()

    def _delete_signal_tree(root_id: int) -> None:
        if root_id in deleted_signal_ids:
            return
        child_signals = db.query(Signal).filter(Signal.open_signal_id == root_id).all()
        for child in child_signals:
            _delete_signal_tree(child.id)

        trades = db.query(Trade).filter(Trade.signal_id == root_id).all()
        for trade in trades:
            deleted_trade_ids.add(trade.id)
            db.delete(trade)

        target = db.query(Signal).filter(Signal.id == root_id).first()
        if target:
            deleted_signal_ids.add(root_id)
            db.delete(target)

    _delete_signal_tree(signal_id)
    db.commit()
    return {
        "ok": True,
        "deleted_id": signal_id,
        "deleted_signal_ids": sorted(deleted_signal_ids),
        "deleted_trade_ids": sorted(deleted_trade_ids),
    }
