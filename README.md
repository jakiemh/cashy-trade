# Cashy Trade

App web multi-usuario para señales del bot, bitácora de trades, dashboard y chatbot interno **Cashy** (sin APIs de IA).

## Estructura

- `backend/` — FastAPI + SQLite/PostgreSQL
- `frontend/` — Next.js
- `Tradingbot_activos/cashy_bridge.py` — puente desde tu bot Python

## 1. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
copy .env.example .env
.\START_BACKEND.bat
```

API docs: http://localhost:8000/docs

Variables en `backend/.env`:

- `BOT_API_KEY` — debe coincidir con `CASHY_API_KEY` en tu bot
- `SECRET_KEY` — JWT de usuarios
- `DATABASE_URL` — por defecto SQLite local
- `ADMIN_EMAILS` — emails con acceso al panel admin (separados por coma)
- `CORS_ORIGINS` — URLs del frontend

## 2. Frontend

Requiere Node.js 18+.

```powershell
cd frontend
copy .env.example .env.local
npm install
npm run dev
```

App: http://localhost:3000

## 3. Conectar tu bot

En `Tradingbot_activos/config.py`:

```python
CASHY_API_URL = "http://localhost:8000"
CASHY_API_KEY = "cashy-bot-dev-key"   # mismo valor que BOT_API_KEY
```

## 4. Flujo de uso

1. Regístrate en `/register`
2. Ve señales en `/signals` — registra trades, filtra, alertas
3. Cierra trades en `/journal` — exporta CSV
4. Consulta stats y curva de equity en `/dashboard`
5. Habla con Cashy (burbuja flotante)
6. Cambia idioma ES/EN en Configuración (engranaje)

## Fases completadas

- [x] Fase 1–2: MVP, watchlist, noticias, Cashy chat
- [x] Fase 3: formularios de trades, filtros, equity curve, polling + alertas
- [x] Fase 4: i18n ES/EN, export CSV, panel admin, Docker + env producción

## PostgreSQL (producción)

```powershell
docker compose up -d
```

En `backend/.env`:

```
DATABASE_URL=postgresql+psycopg://cashy:cashy@localhost:5432/cashy_trade
```

## Deploy producción

### Backend (Railway / Render / Docker)

1. Usa `backend/Dockerfile` o despliega con Python 3.12
2. Copia `backend/.env.production.example` → variables de entorno
3. Conecta PostgreSQL y actualiza `DATABASE_URL`
4. Define `ADMIN_EMAILS` con tu email

### Frontend (Vercel)

1. Importa la carpeta `frontend/`
2. Variable: `NEXT_PUBLIC_API_URL=https://tu-backend.up.railway.app`
3. Deploy

### Bot local

Mantén `CASHY_API_URL` apuntando al backend en producción y `CASHY_API_KEY` igual a `BOT_API_KEY`.

## Panel admin

Agrega tu email en `ADMIN_EMAILS`, reinicia backend e inicia sesión. Verás el enlace **Admin** en el header con stats globales y lista de usuarios.
