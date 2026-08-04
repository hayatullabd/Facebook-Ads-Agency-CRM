import logging
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import agency, auth, clients_users, dashboard, operations, requests
from app.core import database
from app.core.config import get_settings
from app.core.responses import ApiError


logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not getattr(app.state, "skip_database", False):
        await database.connect_database()
    yield
    if not getattr(app.state, "skip_database", False):
        await database.close_database()


def create_app(*, skip_database: bool = False) -> FastAPI:
    settings = get_settings()
    docs_enabled = settings.environment != "production" or settings.production_docs_enabled
    app = FastAPI(
        title=settings.app_name,
        lifespan=lifespan,
        docs_url="/docs" if docs_enabled else None,
        redoc_url="/redoc" if docs_enabled else None,
        openapi_url="/openapi.json" if docs_enabled else None,
    )
    app.state.skip_database = skip_database
    app.state.rate_buckets = defaultdict(deque)
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True, allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"], allow_headers=["Authorization", "Content-Type", "X-Request-ID"])
    if settings.trusted_hosts:
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_hosts)

    @app.middleware("http")
    async def security_and_limits(request: Request, call_next):
        supplied = request.headers.get("x-request-id", "").strip()
        request.state.request_id = supplied[:128] if supplied else str(uuid4())
        if int(request.headers.get("content-length", "0") or 0) > settings.max_body_bytes:
            return JSONResponse(status_code=413, content={"success": False, "message": "Request body is too large", "requestId": request.state.request_id})
        if request.url.path.startswith("/api"):
            key = request.client.host if request.client else "unknown"
            bucket, now = app.state.rate_buckets[key], time.monotonic()
            while bucket and bucket[0] < now - 60: bucket.popleft()
            if len(bucket) >= settings.rate_limit_per_minute:
                return JSONResponse(status_code=429, content={"success": False, "message": "Too many requests", "requestId": request.state.request_id})
            bucket.append(now)
        response = await call_next(request)
        security_headers = {"X-Request-ID": request.state.request_id, "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "no-referrer", "Permissions-Policy": "camera=(), microphone=(), geolocation=()"}
        if settings.environment == "production":
            security_headers.update({"Strict-Transport-Security": "max-age=31536000; includeSubDomains", "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"})
        response.headers.update(security_headers)
        return response

    @app.exception_handler(ApiError)
    async def api_error(request: Request, error: ApiError):
        return JSONResponse(status_code=error.status_code, content={"success": False, "message": error.message, "requestId": request.state.request_id})

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, error: RequestValidationError):
        first = error.errors()[0] if error.errors() else {}
        message = str(first.get("msg", "Invalid request")).removeprefix("Value error, ")
        return JSONResponse(status_code=422, content={"success": False, "message": message, "requestId": request.state.request_id})

    @app.exception_handler(Exception)
    async def unhandled(request: Request, error: Exception):
        logger.error(
            "Unhandled request exception",
            extra={"request_id": request.state.request_id, "method": request.method, "path": request.url.path, "exception_type": type(error).__name__},
            exc_info=True,
        )
        return JSONResponse(status_code=500, content={"success": False, "message": "Internal server error", "requestId": request.state.request_id})

    @app.get("/health/live")
    async def live(): return {"success": True, "status": "live"}

    @app.get("/health/ready")
    @app.get("/health")
    async def ready():
        is_ready = database.ready
        return JSONResponse(status_code=200 if is_ready else 503, content={"success": is_ready, "status": "ready" if is_ready else "not-ready"})

    for router in (auth.router, agency.router, clients_users.router, requests.router, operations.router, dashboard.router):
        app.include_router(router, prefix="/api")

    @app.api_route("/{path:path}", methods=["GET", "POST", "PATCH", "DELETE", "PUT"])
    async def not_found(path: str): raise ApiError(404, "Route not found")
    return app


app = create_app()
