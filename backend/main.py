"""FastAPI entry — loads config from project root `.env` only."""

from pathlib import Path

from dotenv import load_dotenv

# Single global env file: vitalAir/.env
_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_ROOT / ".env", override=False)

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse

from config import get_settings
from db.connection import close_db, ping_db
from db.repositories import ensure_user_email_index
from routes import analyze, analyze_stream, auth, aqi, documents, history, profile, stream
from services.rag_service import ensure_rag_index
from services.redis_client import redis_ping

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        await ensure_user_email_index()
    except Exception:
        pass
    try:
        ensure_rag_index()
    except Exception:
        pass
    yield
    await close_db()


app = FastAPI(title="VitalAir Assistant API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(analyze.router, prefix="/api")
app.include_router(stream.router, prefix="/api")
app.include_router(analyze_stream.router, prefix="/api")
app.include_router(aqi.router, prefix="/api")
app.include_router(history.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(documents.router, prefix="/api")


_API_META = {
    "name": "VitalAir Assistant API",
    "version": "2.0",
    "docs": "/docs",
    "health": "/api/health",
    "aqi": "/api/aqi?city=Lahore",
}

_LANDING_HTML = (_ROOT / "backend" / "static" / "api_landing.html").read_text(
    encoding="utf-8"
)


@app.get("/")
async def root(request: Request):
    accept = request.headers.get("accept", "")
    if "application/json" in accept and "text/html" not in accept:
        return JSONResponse(_API_META)
    return HTMLResponse(_LANDING_HTML)


@app.get("/api")
async def api_meta():
    return _API_META


@app.get("/api/health")
async def health():
    from agents.llm_config import active_llm_provider
    from services.rag_service import retrieve_health_context

    mongo_ok = await ping_db()
    redis_ok = redis_ping()
    rag_probe = retrieve_health_context("Lahore smog AQI health", k=1)
    rag_ok = bool(rag_probe and len(rag_probe) > 20)
    return {
        "status": "ok",
        "version": "2.0",
        "mongodb": mongo_ok,
        "mongodb_status": "connected" if mongo_ok else "disconnected — check root .env",
        "redis": redis_ok,
        "celery_enabled": settings.use_celery,
        "crew_mode": "mock" if settings.use_mock_agents else "live",
        "llm_provider": active_llm_provider(),
        "rag_enabled": rag_ok,
    }
