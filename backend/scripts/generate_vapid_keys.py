#!/usr/bin/env python3
"""Generate VAPID keys for web push notifications.

Usage (from backend/):
  python scripts/generate_vapid_keys.py

Add the output to Vercel env vars: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
"""

import base64

from cryptography.hazmat.primitives.serialization import Encoding, PrivateFormat, PublicFormat, NoEncryption
from py_vapid import Vapid


def export_public_key(vapid: Vapid) -> str:
    raw = vapid.public_key.public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


def export_private_key(vapid: Vapid) -> str:
    return vapid.private_key.private_bytes(
        Encoding.PEM,
        PrivateFormat.PKCS8,
        NoEncryption(),
    ).decode("utf-8")


def main() -> None:
    vapid = Vapid()
    vapid.generate_keys()
    public = export_public_key(vapid)
    private = export_private_key(vapid)
    print("Add these to Vercel -> Settings -> Environment Variables:\n")
    print(f"VAPID_PUBLIC_KEY={public}")
    print("VAPID_PRIVATE_KEY=<paste the full PEM block printed below>")
    print("VAPID_SUBJECT=mailto:tu@email.com")
    print("\n--- VAPID_PRIVATE_KEY (include BEGIN/END lines) ---")
    print(private)


if __name__ == "__main__":
    main()
