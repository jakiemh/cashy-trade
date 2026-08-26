import hashlib
import logging
import secrets
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models import PasswordResetToken, User

logger = logging.getLogger(__name__)

RESET_TTL_HOURS = 1


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def create_password_reset_token(db: Session, user: User) -> str:
    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_token(raw_token)
    expires_at = datetime.utcnow() + timedelta(hours=RESET_TTL_HOURS)

    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at.is_(None),
    ).update({"used_at": datetime.utcnow()})

    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
    )
    db.commit()
    return raw_token


def find_user_for_reset_token(db: Session, raw_token: str) -> User | None:
    token_hash = _hash_token(raw_token.strip())
    now = datetime.utcnow()
    row = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > now,
        )
        .first()
    )
    if not row:
        return None
    return db.query(User).filter(User.id == row.user_id).first()


def mark_reset_token_used(db: Session, raw_token: str) -> None:
    token_hash = _hash_token(raw_token.strip())
    row = db.query(PasswordResetToken).filter(PasswordResetToken.token_hash == token_hash).first()
    if row and row.used_at is None:
        row.used_at = datetime.utcnow()
        db.commit()
