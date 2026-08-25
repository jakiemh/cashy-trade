#!/usr/bin/env python3
"""Generate VAPID keys for web push notifications.

Usage (from backend/):
  python scripts/generate_vapid_keys.py

Add the output to Vercel env vars: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
"""

from py_vapid import Vapid


def main() -> None:
    vapid = Vapid()
    vapid.generate_keys()
    public = vapid.public_key.decode() if isinstance(vapid.public_key, bytes) else str(vapid.public_key)
    private = vapid.private_key.decode() if isinstance(vapid.private_key, bytes) else str(vapid.private_key)
    print("Add these to Vercel → Settings → Environment Variables:\n")
    print(f"VAPID_PUBLIC_KEY={public}")
    print(f"VAPID_PRIVATE_KEY={private}")
    print("VAPID_SUBJECT=mailto:tu@email.com")


if __name__ == "__main__":
    main()
