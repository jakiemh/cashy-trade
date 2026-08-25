from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.db_migrate import ensure_schema
from app.routes import admin, app_routes, auth, chat, signals, trades

Base.metadata.create_all(bind=engine)
ensure_schema()

app = FastAPI(title="Cashy Trade API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(signals.router, prefix="/api")
app.include_router(trades.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(app_routes.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok", "app": "Cashy Trade"}
