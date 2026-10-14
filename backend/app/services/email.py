import logging
import smtplib
from email.message import EmailMessage
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


def _smtp_password() -> str:
    return settings.smtp_password.replace(" ", "")


def email_configured() -> bool:
    if _smtp_configured():
        return True
    return bool(settings.resend_api_key)


def _smtp_configured() -> bool:
    password = _smtp_password()
    user = (settings.smtp_user or "").strip()
    if not user or not password:
        return False
    if "EDIT_ME" in user or "EDIT_ME" in password:
        return False
    return bool(settings.smtp_host)


def email_config_status() -> dict[str, Any]:
    provider = "none"
    if _smtp_configured():
        provider = "smtp"
    elif settings.resend_api_key:
        provider = "resend"

    password = _smtp_password()
    user = (settings.smtp_user or "").strip().lower()
    from_email = settings.email_from or ""
    from_match = user and user in from_email.lower()

    return {
        "configured": email_configured(),
        "provider": provider,
        "smtp_host": settings.smtp_host or None,
        "smtp_port": settings.smtp_port,
        "smtp_user": settings.smtp_user or None,
        "smtp_password_length": len(password),
        "smtp_password_valid_length": len(password) == 16,
        "email_from": settings.email_from,
        "email_from_matches_smtp_user": from_match,
        "app_base_url": settings.app_base_url,
        "placeholders_detected": "EDIT_ME" in (
            f"{settings.smtp_user}{settings.smtp_password}{settings.email_from}"
        ),
    }


def send_test_email(to_email: str) -> tuple[bool, str]:
    subject = "Prueba de correo — Cashy Trade"
    text = "Si ves este mensaje, el envío de correos desde Cashy Trade funciona correctamente."
    html = "<p>Si ves este mensaje, el envío de correos desde <strong>Cashy Trade</strong> funciona correctamente.</p>"
    return _send_email(to_email, subject, text, html)


def send_password_reset_email(to_email: str, reset_url: str) -> tuple[bool, str]:
    subject = "Restablecer contraseña — Cashy Trade"
    text = (
        "Recibimos una solicitud para restablecer tu contraseña en Cashy Trade.\n\n"
        f"Abre este enlace (válido 1 hora):\n{reset_url}\n\n"
        "Si no lo pediste, ignora este correo."
    )
    html = f"""
    <p>Recibimos una solicitud para restablecer tu contraseña en <strong>Cashy Trade</strong>.</p>
    <p><a href="{reset_url}">Restablecer contraseña</a></p>
    <p>Si no lo pediste, ignora este correo.</p>
    """
    return _send_email(to_email, subject, text, html)


def _send_email(to_email: str, subject: str, text: str, html: str) -> tuple[bool, str]:
    if _smtp_configured():
        return _send_via_smtp(to_email, subject, text, html)
    if settings.resend_api_key:
        return _send_via_resend(to_email, subject, text, html)

    message = "Email not configured on server"
    logger.warning("%s; recipient=%s", message, to_email)
    return False, message


def _send_via_resend(to_email: str, subject: str, text: str, html: str) -> tuple[bool, str]:
    payload = {
        "from": settings.email_from,
        "to": [to_email],
        "subject": subject,
        "text": text,
        "html": html,
    }
    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.resend_api_key}"},
                json=payload,
            )
        if response.is_success:
            return True, "sent_via_resend"
        detail = response.text[:300]
        logger.warning("Resend failed (%s): %s", response.status_code, detail)
        return False, f"Resend error {response.status_code}: {detail}"
    except Exception as exc:
        logger.warning("Resend error: %s", exc)
        return False, f"Resend error: {exc}"


def _send_via_smtp(to_email: str, subject: str, text: str, html: str) -> tuple[bool, str]:
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.email_from
    message["To"] = to_email
    message.set_content(text)
    message.add_alternative(html, subtype="html")

    password = _smtp_password()
    user = settings.smtp_user.strip()
    port = settings.smtp_port

    try:
        if port == 465:
            with smtplib.SMTP_SSL(settings.smtp_host, port, timeout=20) as smtp:
                smtp.login(user, password)
                smtp.send_message(message)
        else:
            with smtplib.SMTP(settings.smtp_host, port, timeout=20) as smtp:
                smtp.ehlo()
                smtp.starttls()
                smtp.ehlo()
                smtp.login(user, password)
                smtp.send_message(message)
        return True, "sent_via_smtp"
    except Exception as exc:
        logger.warning("SMTP error: %s", exc)
        return False, f"SMTP error: {exc}"
