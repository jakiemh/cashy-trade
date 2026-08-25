@echo off
set "PATH=C:\Program Files\nodejs;%PATH%"

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000.*LISTENING"') do (
  echo Cerrando proceso anterior en puerto 3000 ^(PID %%a^)...
  taskkill /PID %%a /F >nul 2>&1
)

cd /d %~dp0frontend
if exist .next rmdir /s /q .next

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] No se encontro npm.
  pause
  exit /b 1
)

call npm run dev -- --hostname 0.0.0.0 --port 3000
