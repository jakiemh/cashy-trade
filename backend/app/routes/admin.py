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

    db.query(Trade).filter(Trade.signal_id == signal_id).update({Trade.signal_id: None})
    db.query(Signal).filter(Signal.open_signal_id == signal_id).update({Signal.open_signal_id: None})
    db.delete(signal)
    db.commit()
    return {"ok": True, "deleted_id": signal_id}
