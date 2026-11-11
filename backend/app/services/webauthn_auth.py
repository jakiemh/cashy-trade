import json
import logging
import re
import secrets
from datetime import datetime, timedelta
from urllib.parse import urlparse

from fastapi import HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from webauthn import (
    generate_authentication_options,
    generate_registration_options,
    verify_authentication_response,
    verify_registration_response,
)
from webauthn.helpers import base64url_to_bytes, bytes_to_base64url, options_to_json_dict
from webauthn.helpers.exceptions import (
    InvalidAuthenticationResponse,
    InvalidJSONStructure,
    InvalidRegistrationResponse,
)
from webauthn.helpers.structs import (
    AuthenticatorAttachment,
    AuthenticatorSelectionCriteria,
    AuthenticatorTransport,
    PublicKeyCredentialDescriptor,
    PublicKeyCredentialHint,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

from app.auth import create_access_token
from app.config import settings
from app.models import User, WebAuthnChallenge, WebAuthnCredential

logger = logging.getLogger(__name__)

CHALLENGE_TTL = timedelta(minutes=5)
CREDENTIAL_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,2000}$")


class WebAuthnRejected(Exception):
    def __init__(self, code: str):
        self.code = code
        super().__init__(code)


def http_from_rejected(exc: WebAuthnRejected) -> HTTPException:
    return HTTPException(status_code=400, detail=exc.code)


def _allowed_origins() -> set[str]:
    origins = {origin.rstrip("/") for origin in settings.cors_origin_list}
    origins.add(settings.app_base_url.rstrip("/"))
    return {origin for origin in origins if origin}


def ceremony_context(request: Request) -> tuple[str, str]:
    origin = (request.headers.get("origin") or "").rstrip("/")
    if origin not in _allowed_origins():
        raise WebAuthnRejected("webauthn_origin")
    host = urlparse(origin).hostname
    if not host:
        raise WebAuthnRejected("webauthn_origin")
    return origin, host


def device_label(user_agent: str | None) -> str:
    ua = (user_agent or "").lower()
    if "iphone" in ua:
        return "iPhone"
    if "ipad" in ua:
        return "iPad"
    if "android" in ua:
        return "Android"
    if "mac os" in ua or "macintosh" in ua:
        return "Mac"
    if "windows" in ua:
        return "Windows"
    if "linux" in ua:
        return "Linux"
    return "Device"


def _purge_expired(db: Session) -> None:
    db.query(WebAuthnChallenge).filter(WebAuthnChallenge.expires_at < datetime.utcnow()).delete(
        synchronize_session=False
    )


def _store_challenge(
    db: Session,
    *,
    challenge: bytes,
    purpose: str,
    origin: str,
    rp_id: str,
    user_id: int | None = None,
    reject: bool = False,
    user_handle: str | None = None,
) -> None:
    _purge_expired(db)
    db.add(
        WebAuthnChallenge(
            challenge=bytes_to_base64url(challenge),
            purpose=purpose,
            user_id=user_id,
            reject=reject,
            rp_id=rp_id,
            origin=origin,
            user_handle=user_handle,
            expires_at=datetime.utcnow() + CHALLENGE_TTL,
        )
    )
    db.commit()


def _descriptor(row: WebAuthnCredential) -> PublicKeyCredentialDescriptor | None:
    try:
        credential_id = base64url_to_bytes(row.credential_id)
    except Exception:
        return None
    transports: list[AuthenticatorTransport] = []
    for part in (row.transports or "").split(","):
        if not part:
            continue
        try:
            transports.append(AuthenticatorTransport(part))
        except ValueError:
            continue
    return PublicKeyCredentialDescriptor(id=credential_id, transports=transports or None)


def _user_credentials(db: Session, user_id: int) -> list[WebAuthnCredential]:
    return (
        db.query(WebAuthnCredential)
        .filter(WebAuthnCredential.user_id == user_id)
        .order_by(WebAuthnCredential.created_at.desc())
        .all()
    )


def _selection() -> AuthenticatorSelectionCriteria:
    return AuthenticatorSelectionCriteria(
        authenticator_attachment=AuthenticatorAttachment.PLATFORM,
        resident_key=ResidentKeyRequirement.PREFERRED,
        require_resident_key=None,
        user_verification=UserVerificationRequirement.REQUIRED,
    )


def registration_options(db: Session, user: User, request: Request) -> dict:
    origin, rp_id = ceremony_context(request)
    existing = _user_credentials(db, user.id)
    if existing:
        try:
            user_handle = base64url_to_bytes(existing[0].user_handle)
        except Exception as exc:
            raise WebAuthnRejected("webauthn_invalid") from exc
    else:
        user_handle = secrets.token_bytes(32)

    exclude = [item for item in (_descriptor(row) for row in existing) if item is not None]
    handle_b64 = bytes_to_base64url(user_handle)
    options = generate_registration_options(
        rp_id=rp_id,
        rp_name="Cashy Trade",
        user_id=user_handle,
        user_name=user.email,
        user_display_name=user.name or user.email,
        authenticator_selection=_selection(),
        exclude_credentials=exclude,
        hints=[PublicKeyCredentialHint.CLIENT_DEVICE],
    )
    _store_challenge(
        db,
        challenge=options.challenge,
        purpose="register",
        origin=origin,
        rp_id=rp_id,
        user_id=user.id,
        user_handle=handle_b64,
    )
    return options_to_json_dict(options)


def _credential_dict(payload: dict) -> dict:
    if not isinstance(payload, dict):
        raise WebAuthnRejected("webauthn_invalid")
    encoded = json.dumps(payload)
    if len(encoded) > 20000:
        raise WebAuthnRejected("webauthn_invalid")
    return payload


def _challenge_from_credential(credential: dict) -> str:
    response = credential.get("response")
    client_data_b64 = response.get("clientDataJSON") if isinstance(response, dict) else None
    if not isinstance(client_data_b64, str):
        raise WebAuthnRejected("webauthn_invalid")
    try:
        client_data = json.loads(base64url_to_bytes(client_data_b64))
        challenge = client_data["challenge"]
        if not isinstance(challenge, str):
            raise WebAuthnRejected("webauthn_invalid")
        return bytes_to_base64url(base64url_to_bytes(challenge))
    except WebAuthnRejected:
        raise
    except Exception as exc:
        raise WebAuthnRejected("webauthn_invalid") from exc


def _take_challenge(db: Session, challenge: str, purpose: str) -> WebAuthnChallenge:
    row = db.query(WebAuthnChallenge).filter(WebAuthnChallenge.challenge == challenge).first()
    if row is None or row.purpose != purpose or row.expires_at < datetime.utcnow():
        if row is not None:
            db.delete(row)
            db.commit()
        raise WebAuthnRejected("webauthn_expired")
    return row


def _consume_challenge(db: Session, row: WebAuthnChallenge) -> None:
    consumed = (
        db.query(WebAuthnChallenge)
        .filter(WebAuthnChallenge.id == row.id)
        .delete(synchronize_session=False)
    )
    if consumed != 1:
        db.rollback()
        raise WebAuthnRejected("webauthn_expired")


def _transports_value(credential: dict) -> str | None:
    response = credential.get("response")
    transports = response.get("transports") if isinstance(response, dict) else None
    if not isinstance(transports, list):
        return None
    clean = [item for item in transports if isinstance(item, str) and item]
    if not clean:
        return None
    return ",".join(clean)[:255]


def _user_handle_matches(credential: dict, stored: str) -> bool:
    response = credential.get("response")
    handle = response.get("userHandle") if isinstance(response, dict) else None
    if handle in (None, ""):
        return True
    if not isinstance(handle, str):
        return False
    try:
        return bytes_to_base64url(base64url_to_bytes(handle)) == stored
    except Exception:
        return False


def register_credential(
    db: Session,
    user: User,
    credential_payload: dict,
    user_agent: str | None,
) -> str:
    credential = _credential_dict(credential_payload)
    challenge = _take_challenge(db, _challenge_from_credential(credential), "register")
    if challenge.user_id != user.id:
        _consume_challenge(db, challenge)
        db.commit()
        raise WebAuthnRejected("webauthn_invalid")

    if not challenge.user_handle:
        raise WebAuthnRejected("webauthn_invalid")
    try:
        verified = verify_registration_response(
            credential=credential,
            expected_challenge=base64url_to_bytes(challenge.challenge),
            expected_origin=challenge.origin,
            expected_rp_id=challenge.rp_id,
            require_user_verification=True,
        )
    except (InvalidRegistrationResponse, InvalidJSONStructure) as exc:
        logger.info("WebAuthn registration rejected: %s", exc)
        raise WebAuthnRejected("webauthn_invalid") from exc

    if not verified.user_verified:
        raise WebAuthnRejected("webauthn_invalid")

    credential_id = bytes_to_base64url(verified.credential_id)
    handle = challenge.user_handle
    _consume_challenge(db, challenge)
    db.add(
        WebAuthnCredential(
            user_id=user.id,
            credential_id=credential_id,
            public_key=bytes_to_base64url(verified.credential_public_key),
            user_handle=handle,
            sign_count=verified.sign_count,
            transports=_transports_value(credential),
            device_type=verified.credential_device_type.value,
            backed_up=verified.credential_backed_up,
            aaguid=verified.aaguid or None,
            label=device_label(user_agent),
        )
    )
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        logger.info("WebAuthn credential already registered")
        raise WebAuthnRejected("webauthn_already") from exc
    return credential_id


def _find_stored_credential(db: Session, credential_id: str | None) -> WebAuthnCredential | None:
    if not credential_id or not CREDENTIAL_ID_RE.fullmatch(credential_id):
        return None
    return (
        db.query(WebAuthnCredential)
        .filter(WebAuthnCredential.credential_id == credential_id)
        .first()
    )


def login_options(
    db: Session,
    request: Request,
    *,
    email: str | None,
    credential_id: str | None,
) -> dict:
    origin, rp_id = ceremony_context(request)
    bound_user_id: int | None = None
    reject = False
    rows: list[WebAuthnCredential] = []

    user = None
    if email:
        user = db.query(User).filter(User.email == email.lower()).first()
        if user is None:
            reject = True
        else:
            bound_user_id = user.id
            rows = _user_credentials(db, user.id)

    hinted = _find_stored_credential(db, credential_id)
    if user is None and not reject and hinted is not None:
        bound_user_id = hinted.user_id
        rows = [hinted]
    elif user is not None and hinted is not None and hinted.user_id == user.id and not rows:
        rows = [hinted]

    allow = [item for item in (_descriptor(row) for row in rows) if item is not None]
    options = generate_authentication_options(
        rp_id=rp_id,
        allow_credentials=allow or None,
        user_verification=UserVerificationRequirement.REQUIRED,
    )
    _store_challenge(
        db,
        challenge=options.challenge,
        purpose="login",
        origin=origin,
        rp_id=rp_id,
        user_id=bound_user_id,
        reject=reject,
    )
    payload = options_to_json_dict(options)
    if not payload.get("allowCredentials"):
        payload.pop("allowCredentials", None)
    return payload


def login_with_credential(db: Session, credential_payload: dict) -> str:
    credential = _credential_dict(credential_payload)
    credential_id = credential.get("id")
    if not isinstance(credential_id, str):
        raise WebAuthnRejected("webauthn_invalid")

    challenge = _take_challenge(db, _challenge_from_credential(credential), "login")
    if challenge.reject:
        _consume_challenge(db, challenge)
        db.commit()
        raise WebAuthnRejected("webauthn_invalid")

    stored = _find_stored_credential(db, credential_id)
    if stored is None:
        _consume_challenge(db, challenge)
        db.commit()
        raise WebAuthnRejected("webauthn_not_found")
    if challenge.user_id is not None and challenge.user_id != stored.user_id:
        _consume_challenge(db, challenge)
        db.commit()
        raise WebAuthnRejected("webauthn_invalid")
    if not _user_handle_matches(credential, stored.user_handle):
        _consume_challenge(db, challenge)
        db.commit()
        raise WebAuthnRejected("webauthn_invalid")

    try:
        verified = verify_authentication_response(
            credential=credential,
            expected_challenge=base64url_to_bytes(challenge.challenge),
            expected_origin=challenge.origin,
            expected_rp_id=challenge.rp_id,
            credential_public_key=base64url_to_bytes(stored.public_key),
            credential_current_sign_count=stored.sign_count,
            require_user_verification=True,
        )
    except (InvalidAuthenticationResponse, InvalidJSONStructure) as exc:
        logger.info("WebAuthn login rejected: %s", exc)
        raise WebAuthnRejected("webauthn_invalid") from exc

    if not verified.user_verified:
        raise WebAuthnRejected("webauthn_invalid")

    user = db.query(User).filter(User.id == stored.user_id).first()
    if user is None:
        raise WebAuthnRejected("webauthn_invalid")

    _consume_challenge(db, challenge)
    stored.sign_count = verified.new_sign_count
    stored.last_used_at = datetime.utcnow()
    stored.device_type = verified.credential_device_type.value
    stored.backed_up = verified.credential_backed_up
    if user.email in settings.admin_email_list and not user.is_admin:
        user.is_admin = True
    db.commit()
    return create_access_token(user.id)
