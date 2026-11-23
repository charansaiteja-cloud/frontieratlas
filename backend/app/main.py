"""Main FastAPI application."""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.config import settings
from app.database import init_db, close_db
from app.api import router as api_router
from app.resolvers import entity_resolver


# CORS: development wildcard; override via FA_CORS_ORIGINS env var for production
_cors_origins = os.getenv("FA_CORS_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await entity_resolver.seed_entities()
    yield
    await close_db()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
)

# Trusted host middleware — prevents HTTP Host header attacks
# Accept 'test' hostname for pytest-asyncio ASGI transport compatibility
_trusted_hosts = os.getenv("FA_TRUSTED_HOSTS", "localhost,127.0.0.1,test,.onrender.com,.railway.app").split(",")
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=_trusted_hosts,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
)

app.include_router(api_router, prefix="/api")


@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title=f"{settings.app_name} - API Documentation",
    )


@app.get("/openapi.json", include_in_schema=False)
async def openapi():
    return app.openapi()


@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/api/health",
    }