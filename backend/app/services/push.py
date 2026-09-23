import json
import logging
from typing import Any

from sqlalchemy.orm import Session

from app.config import settings
from app.models import PushSubscription

logger = logging.getLogger(__name__)


def vapid_configured() -> bool:
    public = settings.vapid_public_key or ""
    private = settings.vapid_private_key or ""
    subject = settings.vapid_subject or ""
    if not public or not private or not subject:
        return False
    if "ECPublicKey object" in public or public.startswith("<"):
        return False
    return True


def get_vapid_public_key() -> str | None:
    public = settings.vapid_public_key or None
    if not public or "ECPublicKey object" in public:
        return None
    return public


def notify_users_new_signal(db: Session, signal: dict[str, Any]) -> int:
    if not vapid_configured():
        return 0
    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        logger.warning("pywebpush not installed; skipping push notifications")
        return 0

    prefix = "" if signal.get("bot_executed", True) else "Referencia · "
    title = f"{prefix}{signal.get('type', 'Signal')} {signal.get('symbol', '')}".strip()
    body = _signal_body(signal)
    payload = json.dumps({"title": title, "body": body, "url": "/signals"})
    sent = 0
    stale: list[PushSubscription] = []

    subscriptions = db.query(PushSubscription).all()
    for sub in subscriptions:
        subscription_info = {
            "endpoint": sub.endpoint,
            "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
        }
        try:
            webpush(
                subscription_info=subscription_info,
                data=payload,
                vapid_private_key=settings.vapid_private_key,
                vapid_claims={"sub": settings.vapid_subject},
            )
            sent += 1
        except WebPushException as exc:
            status = getattr(getattr(exc, "response", None), "status_code", None)
            if status in (404, 410):
                stale.append(sub)
            else:
                logger.warning("Web push failed for %s: %s", sub.endpoint[:48], exc)
        except Exception as exc:
            logger.warning("Web push error: %s", exc)

    for sub in stale:
        db.delete(sub)
    if stale:
        db.commit()
    return sent


def _signal_body(signal: dict[str, Any]) -> str:
    symbol = signal.get("symbol", "")
    reference = "" if signal.get("bot_executed", True) else "Bot no entró · "
    if signal.get("type") == "COMPRA":
        price = signal.get("entry_price")
        if price is not None:
            return f"{reference}Entrada ${price:.2f}"
        return f"{reference}Nueva señal de compra"
    if signal.get("type") == "CIERRE":
        pnl = signal.get("pnl_pct")
        return f"Resultado {pnl:+.1f}%" if pnl is not None else "Cierre de posición"
    return f"Nueva señal para {symbol}"
