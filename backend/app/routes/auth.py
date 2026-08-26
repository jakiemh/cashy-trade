from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import authenticate_user, create_access_token, create_user, update_user_password
from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas import (
    ForgotPasswordIn,
    OkMessage,
    ResetPasswordIn,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserOut,
)
from app.services.email import send_password_reset_email
from app.services.password_reset import (
    create_password_reset_token,
    find_user_for_reset_token,
    mark_reset_token_used,
)

router = APIRouter(prefix="/auth", tags=["auth"])

RESET_SENT_MESSAGE = "Si el correo existe, recibirás un enlace para restablecer la contraseña."


@router.post("/register", response_model=TokenResponse)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = create_user(db, payload.email, payload.password, payload.name)
    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return TokenResponse(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.post("/forgot-password", response_model=OkMessage)
def forgot_password(
    payload: ForgotPasswordIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if user:
        raw_token = create_password_reset_token(db, user)
        reset_url = f"{settings.app_base_url.rstrip('/')}/reset-password?token={raw_token}"
        background_tasks.add_task(send_password_reset_email, user.email, reset_url)
    return OkMessage(message=RESET_SENT_MESSAGE)


@router.post("/reset-password", response_model=OkMessage)
def reset_password(payload: ResetPasswordIn, db: Session = Depends(get_db)):
    user = find_user_for_reset_token(db, payload.token)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    update_user_password(db, user, payload.password)
    mark_reset_token_used(db, payload.token)
    return OkMessage(message="Contraseña actualizada. Ya puedes iniciar sesión.")
