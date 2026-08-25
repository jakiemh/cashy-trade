from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.cashy.engine import process_message, save_chat_exchange
from app.database import get_db
from app.dependencies import get_current_user
from app.models import ChatMessage, User
from app.schemas import ChatMessageIn, ChatMessageOut

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatMessageOut)
def chat(
    payload: ChatMessageIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reply = process_message(db, user.id, user.locale, payload.message)
    save_chat_exchange(db, user.id, payload.message, reply)
    return ChatMessageOut(role="assistant", content=reply, created_at=datetime.utcnow())


@router.get("/history", response_model=list[ChatMessageOut])
def history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.user_id == user.id)
        .order_by(ChatMessage.created_at.desc())
        .limit(50)
        .all()
    )
    return list(reversed(messages))
