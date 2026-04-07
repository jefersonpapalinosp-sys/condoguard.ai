from __future__ import annotations

from collections import defaultdict, deque
from datetime import datetime, timezone
from time import perf_counter
from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.routes import router
from app.api.contracts_module_routes import contracts_router
from app.core.config import settings
from app.core.errors import ApiRequestError
from app.observability.metrics_store import (
    record_api_error_code_metric,
    record_api_request_metric,
    reset_observability_metrics,
)
from app.repositories.cadastros_repo import reset_cadastros_store
from app.repositories.chat_telemetry_repo import reset_chat_telemetry_store
from app.repositories.contracts_management_repo import reset_contracts_management_state
from app.utils.logging import configure_logging, log_security_event


def _api_error_response(status_code: int, code: str, message: str, details: dict[str, Any] | None = None) -> JSONResponse:
    record_api_error_code_metric(code)
    payload = {"error": {"code": code, "message": message, "details": details}}
    return JSONResponse(status_code=status_code, content=payload)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


class CorsAllowlistMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin")
        if origin:
            if origin not in settings.allowed_origins:
                log_security_event("cors_denied", request, {"origin": origin})
                return _api_error_response(403, "CORS_DENIED", "Origem nao permitida por CORS.", {"origin": origin})

            if request.method.upper() == "OPTIONS":
                # 204 must not include a response body; otherwise uvicorn may raise
                # "Response content longer than Content-Length" during preflight.
                response = Response(status_code=204)
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Vary"] = "Origin"
                response.headers["Access-Control-Allow-Methods"] = "GET,POST,PATCH,DELETE,OPTIONS"
                response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
                return response

            response = await call_next(request)
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Vary"] = "Origin"
            response.headers["Access-Control-Allow-Methods"] = "GET,POST,PATCH,DELETE,OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            return response

        return await call_next(request)


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.requests = defaultdict(deque)
        self.login_requests = defaultdict(deque)

    def _accept(self, bucket: deque, limit: int, window_ms: int) -> bool:
        now = perf_counter()
        window_s = window_ms / 1000
        while bucket and now - bucket[0] > window_s:
            bucket.popleft()
        if len(bucket) >= limit:
            return False
        bucket.append(now)
        return True

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if not path.startswith("/api") or path == "/api/health":
            return await call_next(request)

        ip = request.client.host if request.client else "unknown"

        if path == "/api/auth/login" and request.method.upper() == "POST":
            bucket = self.login_requests[ip]
            if not self._accept(bucket, settings.login_rate_limit_max, settings.rate_limit_window_ms):
                log_security_event("rate_limit_exceeded", request, {"scope": "login"})
                return _api_error_response(429, "RATE_LIMITED", "Muitas tentativas de login. Aguarde e tente novamente.")

        bucket = self.requests[ip]
        if not self._accept(bucket, settings.rate_limit_max, settings.rate_limit_window_ms):
            log_security_event("rate_limit_exceeded", request, {"scope": "api"})
            return _api_error_response(429, "RATE_LIMITED", "Muitas requisicoes. Tente novamente em instantes.")

        return await call_next(request)

    def reset_state(self):
        self.requests.clear()
        self.login_requests.clear()


class ObservabilityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        started = perf_counter()
        response = await call_next(request)
        latency_ms = (perf_counter() - started) * 1000
        if request.url.path.startswith("/api"):
            record_api_request_metric(request.method, request.url.path, response.status_code, latency_ms)
        return response


configure_logging()
reset_observability_metrics()
reset_chat_telemetry_store()
reset_cadastros_store()
reset_contracts_management_state()

app = FastAPI(title="CondoGuard API (FastAPI)", version="1.0.0")
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(CorsAllowlistMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(ObservabilityMiddleware)
app.include_router(router)
app.include_router(contracts_router)


def reset_runtime_state() -> None:
    reset_observability_metrics()
    reset_chat_telemetry_store()
    reset_cadastros_store()
    reset_contracts_management_state()

    if app.middleware_stack is None:
        app.middleware_stack = app.build_middleware_stack()

    current = app.middleware_stack
    while current is not None:
        if isinstance(current, RateLimitMiddleware):
            current.reset_state()
            break
        current = getattr(current, "app", None)


@app.exception_handler(ApiRequestError)
async def api_request_error_handler(request: Request, exc: ApiRequestError):
    payload = {"error": {"code": exc.code, "message": exc.message, "details": exc.details}}
    log_security_event("api_error_response", request, {"status": exc.status_code, "code": exc.code})
    record_api_error_code_metric(exc.code)
    return JSONResponse(status_code=exc.status_code, content=payload)


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception):
    payload = {"error": {"code": "INTERNAL_ERROR", "message": "Erro interno no servidor.", "details": None}}
    log_security_event("api_error_response", request, {"status": 500, "code": "INTERNAL_ERROR"})
    record_api_error_code_metric("INTERNAL_ERROR")
    return JSONResponse(status_code=500, content=payload)
