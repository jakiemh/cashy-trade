# Deploy en Vercel (frontend + backend)

## 1. Base de datos Neon (gratis)

1. Crea cuenta en [neon.tech](https://neon.tech)
2. Crea un proyecto PostgreSQL
3. Copia la connection string (formato `postgresql://...`)

## 2. Variables en Vercel

En tu proyecto Vercel → **Settings → Environment Variables**:

| Variable | Valor |
|----------|--------|
| `DATABASE_URL` | Connection string de Neon |
| `SECRET_KEY` | String largo aleatorio (JWT) |
| `BOT_API_KEY` | Misma clave que en tu bot Python |
| `ADMIN_EMAILS` | tu@email.com |
| `CORS_ORIGINS` | `https://TU-APP.vercel.app` |

**No configures** `NEXT_PUBLIC_API_URL` en Vercel — el frontend usa rutas relativas (`/api/...`) en el mismo dominio.

## 3. Deploy

- Root Directory: `./` (raíz del repo)
- Framework: **Services** (detectado por `vercel.json`)
- **Node.js Version:** `22.x` (Settings → General → Node.js Version)
- **Región:** Vercel usa **US East (iad1)** por defecto — compatible con Neon Ohio
- Conecta el repo `jakiemh/cashy-trade` y deploy

Rutas:
- `https://tu-app.vercel.app` → frontend Next.js
- `https://tu-app.vercel.app/api/*` → backend FastAPI
- `https://tu-app.vercel.app/health` → health check

## 4. Bot en tu PC

En `Tradingbot_activos/config.py`:

```python
CASHY_API_URL = "https://TU-APP.vercel.app"
CASHY_API_KEY = "misma-clave-que-BOT_API_KEY"
```

## Desarrollo local

```powershell
# Terminal 1
.\START_BACKEND.bat

# Terminal 2 — frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8001
.\START_FRONTEND.bat
```
