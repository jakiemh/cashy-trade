# Cashy Trade

App web multi-usuario para señales del bot, bitácora de trades, dashboard y chatbot interno **Cashy** (sin APIs de IA).

**Producción:** https://cashy-trade.vercel.app

## Estructura

- `backend/` — FastAPI + PostgreSQL (Neon en prod)
- `frontend/` — Next.js
- `Tradingbot_activos/cashy_bridge.py` — puente desde tu bot Python

## Desarrollo local

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
copy .env.example .env
cd ..
.\START_BACKEND.bat
```

API docs: http://localhost:8001/docs (o 8000)

Variables en `backend/.env`:

| Variable | Descripción |
|----------|-------------|
| `BOT_API_KEY` | Debe coincidir con `CASHY_API_KEY` en el bot |
| `SECRET_KEY` | JWT de usuarios |
| `DATABASE_URL` | SQLite local por defecto |
| `ADMIN_EMAILS` | Emails admin (coma-separados) |
| `CORS_ORIGINS` | `http://localhost:3000` |

### Frontend

```powershell
cd frontend
copy .env.example .env.local
npm install
npm run dev
```

App: http://localhost:3000

`frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8001
```

## Conectar tu bot

En `Tradingbot_activos/config.py`:

```python
# Producción
CASHY_API_URL = "https://cashy-trade.vercel.app"
CASHY_API_KEY = "<ver scripts/.production-secrets.local>"

# Local
# CASHY_API_URL = "http://localhost:8001"
# CASHY_API_KEY = "cashy-bot-dev-key"
```

El bridge incluye seguro `cashy_compra_ok`: si falla el POST de COMPRA, reenvía antes del CIERRE.

## Flujo de uso

1. Regístrate en `/register`
2. Ve señales en `/signals` — registra trades, filtros, alertas
3. Cierra trades en `/journal` — exporta CSV
4. Stats y curva de equity en `/dashboard`
5. Tickers con precios y noticias en `/tickers`
6. Cashy (burbuja flotante) — win rate, señales hoy, noticias
7. Idioma ES/EN en Configuración (engranaje)

## Fases completadas

- [x] **Fase 1–2:** MVP, watchlist, noticias, Cashy chat
- [x] **Fase 3:** formularios trades, filtros, equity curve, polling + alertas
- [x] **Fase 4:** i18n ES/EN, export CSV, panel admin, deploy producción
- [x] **Fase 5 (parcial):** admin gestión señales, PWA tema claro, polling global, README Vercel

## Deploy producción (Vercel + Neon)

Guía completa: [`DEPLOY_VERCEL.md`](DEPLOY_VERCEL.md)

Resumen:

1. **Neon** — PostgreSQL gratis, copia `DATABASE_URL`
2. **Vercel** — importa repo, Root `./`, framework Services
3. **Variables Vercel:** `DATABASE_URL`, `SECRET_KEY`, `BOT_API_KEY`, `ADMIN_EMAILS`, `CORS_ORIGINS`
4. **No configures** `NEXT_PUBLIC_API_URL` en Vercel (same-origin `/api/...`)

## Panel admin

Agrega tu email en `ADMIN_EMAILS`. En `/admin` puedes:

- Ver stats globales y usuarios
- **Eliminar señales** (ej. TEST de prueba) — también borra los trades asociados en la bitácora

## PostgreSQL local (opcional)

```powershell
docker compose up -d
```

```
DATABASE_URL=postgresql+psycopg://cashy:cashy@localhost:5432/cashy_trade
```
