#!/usr/bin/env bash
# Agrega variables SMTP para reset de contraseña en Vercel.
# Requiere: npx vercel login (o variable VERCEL_TOKEN)
# Uso: ./scripts/set-smtp-vercel.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .vercel/project.json ]]; then
  echo "Vinculando proyecto Vercel..."
  npx --yes vercel@latest link
fi

if ! npx --yes vercel@latest whoami >/dev/null 2>&1 && [[ -z "${VERCEL_TOKEN:-}" ]]; then
  echo "Inicia sesión en Vercel:"
  npx --yes vercel@latest login
fi

declare -A VARS=(
  [APP_BASE_URL]="https://cashy-trade.vercel.app"
  [SMTP_HOST]="smtp.gmail.com"
  [SMTP_PORT]="587"
  [SMTP_USER]="EDIT_ME@gmail.com"
  [SMTP_PASSWORD]="EDIT_ME_APP_PASSWORD"
  [EMAIL_FROM]="Cashy Trade <EDIT_ME@gmail.com>"
)

echo ""
echo "Agregando variables SMTP (edita EDIT_ME en Vercel después)..."
echo ""

for key in "${!VARS[@]}"; do
  val="${VARS[$key]}"
  echo "  $key"
  for env in production preview development; do
    printf '%s' "$val" | npx --yes vercel@latest env add "$key" "$env" --force >/dev/null 2>&1 || true
  done
done

echo ""
echo "Listo. Edita en Vercel → Settings → Environment Variables:"
echo "  - SMTP_USER → tu Gmail"
echo "  - SMTP_PASSWORD → contraseña de aplicación Gmail"
echo "  - EMAIL_FROM → Cashy Trade <tu@gmail.com>"
echo ""
echo "Luego: npx vercel deploy --prod"
echo ""
