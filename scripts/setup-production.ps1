# Cashy Trade — setup producción (Vercel + Neon)
# Requiere: vercel login + neonctl auth (una sola vez)
# Uso: .\scripts\setup-production.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Require-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Falta $name. Instala Node.js y ejecuta: npm i -g vercel neonctl"
  }
}

Require-Command "npx"

Write-Host "`n=== Cashy Trade — Setup producción ===`n" -ForegroundColor Cyan

# 1. Vercel auth
$whoami = npx vercel@latest whoami 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "Inicia sesión en Vercel (se abrirá el navegador):" -ForegroundColor Yellow
  npx vercel@latest login
}

# 2. Link proyecto (si no existe)
if (-not (Test-Path ".vercel\project.json")) {
  Write-Host "`nVinculando proyecto Vercel (elige el proyecto cashy-trade existente)..." -ForegroundColor Yellow
  npx vercel@latest link --yes 2>$null
  if ($LASTEXITCODE -ne 0) {
    npx vercel@latest link
  }
}

# 3. Neon auth + connection string
Write-Host "`n=== Neon ===" -ForegroundColor Cyan
$neonAuth = npx neonctl@latest me 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "Inicia sesión en Neon:" -ForegroundColor Yellow
  npx neonctl@latest auth
}

$projectName = Read-Host "Nombre del proyecto Neon (ej: cashy_tradebot)"
$databaseUrl = npx neonctl@latest connection-string $projectName --pooled 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "No pude obtener la URL. Pégala manualmente desde el dashboard de Neon." -ForegroundColor Red
  $databaseUrl = Read-Host "DATABASE_URL"
}

# 4. Generar claves si no existen
$secretsFile = Join-Path $Root "scripts\.production-secrets.local"
if (Test-Path $secretsFile) {
  Get-Content $secretsFile | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') { Set-Variable -Name $matches[1] -Value $matches[2] -Scope Script }
  }
} else {
  $secretKey = python -c "import secrets; print(secrets.token_urlsafe(48))"
  $botKey = python -c "import secrets; print(secrets.token_urlsafe(32))"
  @(
    "SECRET_KEY=$secretKey"
    "BOT_API_KEY=$botKey"
  ) | Set-Content $secretsFile -Encoding UTF8
  Write-Host "Claves guardadas en scripts\.production-secrets.local (no se sube a git)" -ForegroundColor Green
}

if (-not $secretKey) { $secretKey = (Get-Content $secretsFile | Where-Object { $_ -like 'SECRET_KEY=*' }) -replace 'SECRET_KEY=', '' }
if (-not $botKey) { $botKey = (Get-Content $secretsFile | Where-Object { $_ -like 'BOT_API_KEY=*' }) -replace 'BOT_API_KEY=', '' }

$adminEmail = Read-Host "Tu email (ADMIN_EMAILS)"
$vercelUrl = Read-Host "URL de Vercel (ej: https://cashy-trade.vercel.app)"

# 5. Subir env vars a Vercel
Write-Host "`nConfigurando variables en Vercel..." -ForegroundColor Cyan
$vars = @{
  DATABASE_URL = $databaseUrl.Trim()
  SECRET_KEY = $secretKey.Trim()
  BOT_API_KEY = $botKey.Trim()
  ADMIN_EMAILS = $adminEmail.Trim()
  CORS_ORIGINS = $vercelUrl.Trim().TrimEnd('/')
}

foreach ($key in $vars.Keys) {
  $val = $vars[$key]
  Write-Host "  $key"
  echo $val | npx vercel@latest env add $key production --force 2>&1 | Out-Null
  echo $val | npx vercel@latest env add $key preview --force 2>&1 | Out-Null
  echo $val | npx vercel@latest env add $key development --force 2>&1 | Out-Null
}

# 6. Deploy
Write-Host "`nDesplegando..." -ForegroundColor Cyan
npx vercel@latest deploy --prod

Write-Host "`n=== Listo ===" -ForegroundColor Green
Write-Host "App: $vercelUrl"
Write-Host "Health: $vercelUrl/health"
Write-Host "`nBot (Tradingbot_activos/config.py):"
Write-Host "  CASHY_API_URL = `"$($vercelUrl.Trim().TrimEnd('/'))`""
Write-Host "  CASHY_API_KEY = `"$($botKey.Trim())`""
