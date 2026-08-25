from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, verify_bot_api_key
from app.models import Signal, User
from app.schemas import SignalIn, SignalOut
from app.services.push import notify_users_new_signal
from app.services.signal_hub import signal_hub
from app.services.signals import create_signal, user_taken_signal_ids

router = APIRouter(prefix="/signals", tags=["signals"])


def _serialize_signals(db: Session, user_id: int, signals: list[Signal]) -> list[SignalOut]:
    taken_ids = user_taken_signal_ids(db, user_id, [s.id for s in signals])
    return [
        SignalOut.model_validate(
            {
                **SignalOut.model_validate(s).model_dump(),
                "taken_by_user": s.id in taken_ids,
            }
        )
        for s in signals
    ]


@router.post("", response_model=SignalOut, dependencies=[Depends(verify_bot_api_key)])
def ingest_signal(payload: SignalIn, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    signal = create_signal(db, payload)
    out = SignalOut.model_validate({**SignalOut.model_validate(signal).model_dump(), "taken_by_user": False})
    payload_dict = out.model_dump(mode="json")
    signal_hub.broadcast_sync(payload_dict)
    background_tasks.add_task(_push_new_signal, payload_dict)
    return out


def _push_new_signal(payload: dict) -> None:
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        notify_users_new_signal(db, payload)
    finally:
        db.close()


@router.get("", response_model=list[SignalOut])
def list_signals(
    active_only: bool = Query(default=False),
    signal_type: str | None = Query(default=None),
    symbol: str | None = Query(default=None),
    setup: str | None = Query(default=None),
    taken: bool | None = Query(default=None),
    since: datetime | None = Query(default=None),
    limit: int = Query(default=100, le=500),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Signal).order_by(Signal.timestamp.desc())
    if active_only:
        query = query.filter(Signal.is_active.is_(True))
    if signal_type:
        query = query.filter(Signal.type == signal_type.upper())
    if symbol:
        query = query.filter(Signal.symbol == symbol.upper())
    if setup:
        needle = f"%{setup.strip()}%"
        query = query.filter(
            (Signal.setup_name.ilike(needle)) | (Signal.strategy.ilike(needle))
        )
    if since:
        query = query.filter(Signal.timestamp > since)
    signals = query.limit(limit).all()
    serialized = _serialize_signals(db, user.id, signals)
    if taken is not None:
        serialized = [signal for signal in serialized if signal.taken_by_user is taken]
    return serialized


@router.get("/{signal_id}", response_model=SignalOut)
def get_signal(
    signal_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    signal = db.query(Signal).filter(Signal.id == signal_id).first()
    if not signal:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Signal not found")
    return _serialize_signals(db, user.id, [signal])[0]
