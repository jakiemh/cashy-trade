#!/usr/bin/env python3
"""Generate VAPID keys and push them to Vercel (requires vercel CLI logged in)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

from py_vapid import Vapid

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent
sys.path.insert(0, str(BACKEND_ROOT))

from scripts.generate_vapid_keys import export_private_key, export_public_key

SUBJECT = "mailto:jkmtrader25@gmail.com"


def run_shell(command: str) -> None:
    result = subprocess.run(
        command,
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
        shell=True,
    )
    if result.returncode != 0:
        if result.stdout.strip():
            print(result.stdout.strip())
        if result.stderr.strip():
            print(result.stderr.strip(), file=sys.stderr)
        raise SystemExit(result.returncode)
    if result.stdout.strip():
        print(result.stdout.strip())


def update_env_value(name: str, value: str) -> None:
    escaped = value.replace('"', '\\"')
    run_shell(
        f'npx --yes vercel@latest env update {name} production --value "{escaped}" --yes --sensitive'
    )


def update_env_from_file(name: str, path: Path) -> None:
    run_shell(f'type "{path}" | npx --yes vercel@latest env update {name} production --yes --sensitive')


def main() -> None:
    vapid = Vapid()
    vapid.generate_keys()
    public = export_public_key(vapid)
    private = export_private_key(vapid)

    update_env_value("VAPID_PUBLIC_KEY", public)
    update_env_value("VAPID_SUBJECT", SUBJECT)

    pem_path = Path(tempfile.gettempdir()) / "cashy-vapid-private.pem"
    pem_path.write_text(private, encoding="ascii")
    try:
        update_env_from_file("VAPID_PRIVATE_KEY", pem_path)
    finally:
        pem_path.unlink(missing_ok=True)

    run_shell("npx --yes vercel@latest deploy --prod --yes")
    print(json.dumps({"ok": True, "public_key_prefix": public[:12], "enabled": True}))


if __name__ == "__main__":
    main()
