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
| `APP_BASE_URL` | `https://TU-APP.vercel.app` (enlaces de reset de contraseña) |
| `RESEND_API_KEY` | (opcional) API key de [Resend](https://resend.com) |
| `EMAIL_FROM` | Ver sección de email abajo |
| `VAPID_PUBLIC_KEY` | (opcional) clave pública push — ver abajo |
| `VAPID_PRIVATE_KEY` | (opcional) clave privada push |
| `VAPID_SUBJECT` | `mailto:tu@email.com` |

Para **notificaciones push en móvil** (PWA), genera claves VAPID:

```powershell
cd backend
pip install pywebpush
python scripts/generate_vapid_keys.py
```

Copia las 3 variables a Vercel y redeploy. En la app, entra a **Señales → Alertas** para activar permisos + suscripción push.

## Recuperar contraseña (Resend)

**Importante:** `APP_BASE_URL` va en **Vercel**, no en Resend. Es la URL de tu app (ej. `https://cashy-trade.vercel.app`) que se usa en el enlace del correo.

En **Resend** solo configuras el dominio desde el que **envías** correos. **No puedes usar `*.vercel.app`** porque Vercel no permite editar DNS de ese subdominio.

### Opción A — Pruebas (rápido)

1. Crea cuenta en [resend.com](https://resend.com) y genera una API key.
2. En Vercel:
   - `RESEND_API_KEY` = tu API key
   - `EMAIL_FROM` = `Cashy Trade <onboarding@resend.dev>`
   - `APP_BASE_URL` = `https://cashy-trade.vercel.app`
3. Con `onboarding@resend.dev` solo puedes enviar al email con el que te registraste en Resend.

### Opción B — Producción (dominio propio)

1. Usa un dominio que **tú controles** (ej. `tudominio.com`), no `vercel.app`.
2. En Resend → **Domains** → agrega un subdominio (ej. `mail.tudominio.com`).
3. Agrega los registros DNS (TXT/MX) en tu proveedor de dominio o usa **Auto Configure** si el dominio está en Vercel.
4. En Vercel:
   - `EMAIL_FROM` = `Cashy Trade <noreply@mail.tudominio.com>`
   - `APP_BASE_URL` = `https://cashy-trade.vercel.app` (sigue siendo tu app en Vercel)

Alternativa SMTP (Gmail app password): `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER`, `SMTP_PASSWORD`.

**PWA instalable:** manifest + service worker + banner "Instalar" en la app. En iPhone: Safari → Compartir → Añadir a pantalla de inicio.

**WebSocket:** las señales en vivo usan `wss://tu-app.vercel.app/api/ws/signals`. Si el WS no conecta, el frontend hace polling cada 5 s automáticamente.

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
