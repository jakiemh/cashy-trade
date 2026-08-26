# Agrega variables SMTP para reset de contraseña en Vercel.
# Requiere: npx vercel login (o variable VERCEL_TOKEN)
# Uso: .\scripts\set-smtp-vercel.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

if (-not (Test-Path ".vercel\project.json")) {
  Write-Host "Vinculando proyecto Vercel..." -ForegroundColor Yellow
  npx --yes vercel@latest link
}

$whoami = npx --yes vercel@latest whoami 2>&1
if ($LASTEXITCODE -ne 0 -and -not $env:VERCEL_TOKEN) {
  Write-Host "Inicia sesión en Vercel:" -ForegroundColor Yellow
  npx --yes vercel@latest login
}

$vars = @{
  APP_BASE_URL = "https://cashy-trade.vercel.app"
  SMTP_HOST    = "smtp.gmail.com"
  SMTP_PORT    = "587"
  SMTP_USER    = "EDIT_ME@gmail.com"
  SMTP_PASSWORD = "EDIT_ME_APP_PASSWORD"
  EMAIL_FROM   = "Cashy Trade <EDIT_ME@gmail.com>"
}

Write-Host "`nAgregando variables SMTP (edita los valores EDIT_ME en Vercel después)...`n" -ForegroundColor Cyan

foreach ($key in $vars.Keys) {
  $val = $vars[$key]
  Write-Host "  $key"
  foreach ($envName in @("production", "preview", "development")) {
    echo $val | npx --yes vercel@latest env add $key $envName --force 2>&1 | Out-Null
  }
}

Write-Host "`nVariables creadas. Edita en Vercel → Settings → Environment Variables:" -ForegroundColor Green
Write-Host "  - SMTP_USER → tu Gmail"
Write-Host "  - SMTP_PASSWORD → contraseña de aplicación de Gmail (16 caracteres)"
Write-Host "  - EMAIL_FROM → Cashy Trade <tu@gmail.com>"
Write-Host "`nLuego redeploy: npx vercel deploy --prod`n" -ForegroundColor Yellow
