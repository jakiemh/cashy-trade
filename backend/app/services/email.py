import logging
import smtplib
from email.message import EmailMessage

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


def email_configured() -> bool:
    if settings.resend_api_key:
        return True
    return bool(settings.smtp_host and settings.smtp_user and settings.smtp_password)


def send_password_reset_email(to_email: str, reset_url: str) -> bool:
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

    if settings.resend_api_key:
        return _send_via_resend(to_email, subject, text, html)
    if settings.smtp_host and settings.smtp_user and settings.smtp_password:
        return _send_via_smtp(to_email, subject, text, html)

    logger.warning("Email not configured; password reset link for %s: %s", to_email, reset_url)
    return False


def _send_via_resend(to_email: str, subject: str, text: str, html: str) -> bool:
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
            return True
        logger.warning("Resend failed (%s): %s", response.status_code, response.text[:300])
    except Exception as exc:
        logger.warning("Resend error: %s", exc)
    return False


def _send_via_smtp(to_email: str, subject: str, text: str, html: str) -> bool:
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.email_from
    message["To"] = to_email
    message.set_content(text)
    message.add_alternative(html, subtype="html")

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
            smtp.starttls()
            smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(message)
        return True
    except Exception as exc:
        logger.warning("SMTP error: %s", exc)
        return False
