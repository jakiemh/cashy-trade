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
| `SMTP_HOST` | `smtp.gmail.com` (recomendado sin dominio propio) |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | tu Gmail |
| `SMTP_PASSWORD` | contraseña de aplicación de Gmail |
| `EMAIL_FROM` | `Cashy Trade <tu@gmail.com>` |
| `RESEND_API_KEY` | (opcional) solo con dominio propio verificado en Resend |
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

## Recuperar contraseña por email

`APP_BASE_URL` va en **Vercel** (no en Resend). Es la URL de tu app en los enlaces del correo:

```
APP_BASE_URL=https://cashy-trade.vercel.app
```

### Recomendado sin dominio propio — Gmail SMTP

Permite enviar a **cualquier usuario** sin comprar dominio ni configurar DNS.

1. Usa una cuenta Gmail (puede ser una dedicada al proyecto).
2. Activa verificación en 2 pasos: [Google Account → Security](https://myaccount.google.com/security).
3. Crea una **contraseña de aplicación**: Security → App passwords → Mail → Other ("Cashy Trade").
4. En **Vercel → Environment Variables** agrega:

| Variable | Valor |
|----------|--------|
| `APP_BASE_URL` | `https://cashy-trade.vercel.app` |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `tu@gmail.com` |
| `SMTP_PASSWORD` | contraseña de aplicación (16 caracteres, sin espacios) |
| `EMAIL_FROM` | `Cashy Trade <tu@gmail.com>` |

5. **No configures** `RESEND_API_KEY` si usas Gmail (SMTP tiene prioridad, pero evita confusiones).
6. Redeploy en Vercel.

Prueba en `/login` → **¿Olvidaste tu contraseña?**

### Resend (solo si tienes dominio propio)

Sin dominio, Resend en modo prueba (`onboarding@resend.dev`) **solo envía al email de tu cuenta Resend**, no a todos los usuarios.

Si más adelante compras un dominio, verifica un subdominio en Resend (ej. `mail.tudominio.com`) y usa `RESEND_API_KEY` + `EMAIL_FROM` con ese dominio.

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
