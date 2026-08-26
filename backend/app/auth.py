from datetime import datetime, timedelta

import bcrypt
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.models import User, UserSettings

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        return int(user_id) if user_id else None
    except (JWTError, ValueError):
        return None


def create_user(db: Session, email: str, password: str, name: str = "") -> User:
    normalized = email.lower()
    user = User(
        email=normalized,
        password_hash=hash_password(password),
        name=name,
        is_admin=normalized in settings.admin_email_list,
    )
    db.add(user)
    db.flush()
    db.add(UserSettings(user_id=user.id, bot_avatar_url="/cashy/cashy-hoodie.jpg"))
    db.commit()
    db.refresh(user)
    return user


def update_user_password(db: Session, user: User, password: str) -> None:
    user.password_hash = hash_password(password)
    db.commit()
    db.refresh(user)


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = db.query(User).filter(User.email == email.lower()).first()
    if not user or not verify_password(password, user.password_hash):
        return None
    if user.email in settings.admin_email_list and not user.is_admin:
        user.is_admin = True
        db.commit()
        db.refresh(user)
    return user
