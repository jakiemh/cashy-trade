# Updates VAPID keys on Vercel (requires: npx vercel login + linked .vercel/project.json)
$ErrorActionPreference = "Continue"
$repo = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $repo "backend"
Set-Location $backend

$raw = python -c "from scripts.generate_vapid_keys import export_public_key, export_private_key; from py_vapid import Vapid; v=Vapid(); v.generate_keys(); print(export_public_key(v)); print('---PEM---'); print(export_private_key(v), end='')"
$parts = $raw -split "---PEM---"
$public = $parts[0].Trim()
$pem = $parts[1].Trim()
$subject = "mailto:jkmtrader25@gmail.com"

Set-Location $repo

function Update-Env($name, $value) {
  $value | npx --yes vercel@latest env update $name production --yes --sensitive 2>&1 | Out-String | Write-Host
}

Update-Env "VAPID_PUBLIC_KEY" $public
Update-Env "VAPID_PRIVATE_KEY" $pem
Update-Env "VAPID_SUBJECT" $subject

Write-Host "Redeploying production..."
npx --yes vercel@latest deploy --prod --yes 2>&1 | Out-String | Write-Host
Write-Host "Public key starts with: $($public.Substring(0, 12))..."
