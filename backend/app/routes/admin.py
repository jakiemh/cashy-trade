from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_admin_user
from app.models import Signal, Trade, User
from app.schemas import AdminStatsOut, AdminUserOut

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
