@echo off
cd /d %~dp0backend

echo Verificando puerto 8000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000.*LISTENING"') do (
  echo Cerrando proceso anterior en puerto 8000 ^(PID %%a^)...
  taskkill /PID %%a /F >nul 2>&1
)

timeout /t 2 /nobreak >nul

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000.*LISTENING"') do (
  echo.
  echo [ERROR] El puerto 8000 sigue en uso ^(PID %%a^).
  echo Ejecuta manualmente: taskkill /PID %%a /F
  echo.
  pause
  exit /b 1
)

echo Iniciando backend Cashy Trade...
call .venv\Scripts\uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
