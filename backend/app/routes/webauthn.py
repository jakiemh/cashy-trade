import logging
from collections.abc import Callable
from typing import TypeVar

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.db_migrate import ensure_schema
from app.models import User, WebAuthnCredential
from app.schemas import (
    OkMessage,
    TokenResponse,
    WebAuthnCredentialOut,
    WebAuthnLoginIn,
    WebAuthnLoginOptionsIn,
    WebAuthnOptionsOut,
    WebAuthnRegisteredOut,
    WebAuthnRegisterIn,
)
from app.services.webauthn_auth import (
    WebAuthnRejected,
    http_from_rejected,
    login_options,
    login_with_credential,
    register_credential,
    registration_options,
)
from app.services.webauthn_bridge import WebAuthnDependencyError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth/webauthn", tags=["auth"])
T = TypeVar("T")


def _run_webauthn(action: Callable[[], T]) -> T:
    try:
        return action()
    except WebAuthnRejected as exc:
        raise http_from_rejected(exc) from exc
    except WebAuthnDependencyError as exc:
        logger.exception("WebAuthn dependency unavailable")
        raise HTTPException(status_code=503, detail="webauthn_unavailable") from exc
    except SQLAlchemyError:
        logger.exception("WebAuthn database error; retrying after schema repair")
        ensure_schema()
        try:
            return action()
        except WebAuthnRejected as exc:
            raise http_from_rejected(exc) from exc
        except Exception as exc:
            logger.exception("WebAuthn failed after schema repair")
            raise HTTPException(status_code=503, detail="webauthn_unavailable") from exc
    except Exception as exc:
        logger.exception("WebAuthn handler failed")
        raise HTTPException(status_code=503, detail="webauthn_unavailable") from exc


@router.post("/register/options", response_model=WebAuthnOptionsOut)
def webauthn_register_options(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return WebAuthnOptionsOut(
        options=_run_webauthn(lambda: registration_options(db, user, request))
    )


@router.post("/register/verify", response_model=WebAuthnRegisteredOut)
def webauthn_register_verify(
    payload: WebAuthnRegisterIn,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    credential_id = _run_webauthn(
        lambda: register_credential(db, user, payload.credential, request.headers.get("user-agent"))
    )
    return WebAuthnRegisteredOut(credential_id=credential_id)


@router.get("/credentials", response_model=list[WebAuthnCredentialOut])
def webauthn_credentials(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(WebAuthnCredential)
        .filter(WebAuthnCredential.user_id == user.id)
        .order_by(WebAuthnCredential.created_at.desc())
        .all()
    )
    return rows


@router.delete("/credentials/{credential_id}", response_model=OkMessage)
def webauthn_delete_credential(
    credential_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = (
        db.query(WebAuthnCredential)
        .filter(WebAuthnCredential.id == credential_id, WebAuthnCredential.user_id == user.id)
        .first()
    )
    if row is None:
        raise http_from_rejected(WebAuthnRejected("webauthn_not_found"))
    db.delete(row)
    db.commit()
    return OkMessage(message="Biometría eliminada")


@router.post("/login/options", response_model=WebAuthnOptionsOut)
def webauthn_login_options(
    payload: WebAuthnLoginOptionsIn,
    request: Request,
    db: Session = Depends(get_db),
):
    options = _run_webauthn(
        lambda: login_options(
            db,
            request,
            email=str(payload.email) if payload.email else None,
            credential_id=payload.credential_id,
        )
    )
    return WebAuthnOptionsOut(options=options)


@router.post("/login/verify", response_model=TokenResponse)
def webauthn_login_verify(payload: WebAuthnLoginIn, db: Session = Depends(get_db)):
    token = _run_webauthn(lambda: login_with_credential(db, payload.credential))
    return TokenResponse(access_token=token)
