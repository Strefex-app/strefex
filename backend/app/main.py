"""FastAPI application entry: multi-tenant B2B API."""
import os
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.config import get_settings
from app.core.security import decode_token
from app.database import init_db

settings = get_settings()

# ── Sentry error tracking (optional) ─────────────────────────
SENTRY_DSN = os.getenv("SENTRY_DSN", "")
if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=os.getenv("SENTRY_ENVIRONMENT", "production"),
        release=f"strefex-backend@{os.getenv('APP_VERSION', '1.0.0')}",
        traces_sample_rate=0.2,
        profiles_sample_rate=0.1,
        send_default_pii=False,
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            SqlalchemyIntegration(),
        ],
    )


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup: optional DB init (use Alembic in production)."""
    # await init_db()  # Uncomment to create tables on startup; prefer Alembic
    yield
    # Shutdown: close pools etc. if needed
    pass


app = FastAPI(
    title=settings.app_name,
    description="Multi-tenant B2B REST API for Bubble and FlutterFlow",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next: Any):
    """Add OWASP-recommended security headers to all responses."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Cache-Control"] = "no-store"  # API responses not cached
    # HSTS is handled by reverse proxy (Vercel, Nginx) in production
    return response


@app.middleware("http")
async def add_auth_context(request: Request, call_next: Any):
    """Extract JWT and set request.state.auth_* for user/company context (logging, audit)."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        request.state.auth_user_id = None
        request.state.auth_tenant_id = None
        request.state.auth_payload = None
    else:
        token = auth_header[7:].strip()
        payload = decode_token(token)
        if not payload:
            request.state.auth_user_id = None
            request.state.auth_tenant_id = None
            request.state.auth_payload = None
        else:
            request.state.auth_user_id = payload.get("sub")
            request.state.auth_tenant_id = payload.get("tenant_id")
            request.state.auth_payload = payload
    return await call_next(request)


app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}
