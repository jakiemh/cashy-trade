from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import PushSubscription, User
from app.services.push import get_vapid_public_key, vapid_configured

router = APIRouter(prefix="/push", tags=["push"])


class PushSubscribeIn(BaseModel):
    endpoint: str
    keys: dict[str, str]


class PushKeyOut(BaseModel):
    public_key: str | None
    enabled: bool


@router.get("/vapid-public-key", response_model=PushKeyOut)
def vapid_public_key():
    return PushKeyOut(public_key=get_vapid_public_key(), enabled=vapid_configured())


@router.post("/subscribe")
def subscribe_push(
    payload: PushSubscribeIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not vapid_configured():
        raise HTTPException(status_code=503, detail="Push notifications not configured")
    p256dh = payload.keys.get("p256dh")
    auth = payload.keys.get("auth")
    if not p256dh or not auth:
        raise HTTPException(status_code=400, detail="Invalid subscription keys")

    existing = db.query(PushSubscription).filter(PushSubscription.endpoint == payload.endpoint).first()
    if existing:
        existing.user_id = user.id
        existing.p256dh = p256dh
        existing.auth = auth
    else:
        db.add(
            PushSubscription(
                user_id=user.id,
                endpoint=payload.endpoint,
                p256dh=p256dh,
                auth=auth,
            )
        )
    db.commit()
    return {"ok": True}


@router.delete("/subscribe")
def unsubscribe_push(
    payload: PushSubscribeIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = (
        db.query(PushSubscription)
        .filter(PushSubscription.user_id == user.id, PushSubscription.endpoint == payload.endpoint)
        .first()
    )
    if row:
        db.delete(row)
        db.commit()
    return {"ok": True}
