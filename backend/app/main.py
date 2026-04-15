from __future__ import annotations

import asyncio
from collections import defaultdict, deque
from datetime import datetime, timezone
from time import perf_counter
from typing import Any
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.routes import router
from app.api.contracts_module_routes import contracts_router
from app.api.enel_integration_routes import enel_router
from app.api.sabesp_integration_routes import sabesp_router
from app.api.integration_health_routes import integration_health_router
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
from app.integrations.enel.repository import reset_enel_integration_state
from app.integrations.sabesp.repository import reset_sabesp_integration_state
from app.ai.memory import clear_all_memories
from app.ai.chains import clear_chains_cache
from app.ai.graph import reset_agent_graph
from app.ai.rag.vector_store import reset_vector_store
from app.utils.logging import configure_logging, log_security_event

TRACE_ID_HEADER = "X-Trace-Id"


def _sanitize_trace_id(raw_value: str | None) -> str:
    candidate = str(raw_value or "").strip()
    if candidate and len(candidate) <= 128 and all(char.isalnum() or char in "-_." for char in candidate):
        return candidate
    return uuid4().hex


def get_request_trace_id(request: Request | None) -> str | None:
    trace_id = getattr(getattr(request, "state", None), "trace_id", None)
    return trace_id if isinstance(trace_id, str) and trace_id else None


def _error_payload(code: str, message: str, details: dict[str, Any] | None = None, request: Request | None = None) -> dict[str, Any]:
    return {"error": {"code": code, "message": message, "details": details, "traceId": get_request_trace_id(request)}}


def _api_error_response(
    status_code: int,
    code: str,
    message: str,
    details: dict[str, Any] | None = None,
    request: Request | None = None,
) -> JSONResponse:
    record_api_error_code_metric(code)
    return JSONResponse(status_code=status_code, content=_error_payload(code, message, details, request=request))


class TraceIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request.state.trace_id = _sanitize_trace_id(request.headers.get(TRACE_ID_HEADER))
        response = await call_next(request)
        response.headers[TRACE_ID_HEADER] = request.state.trace_id
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
        if settings.effective_env != "dev":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


class CorsAllowlistMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin")
        if origin:
            if origin not in settings.allowed_origins:
                log_security_event("cors_denied", request, {"origin": origin})
                return _api_error_response(403, "CORS_DENIED", "Origem nao permitida por CORS.", {"origin": origin}, request=request)

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

    def _accept(self, store: dict, key: str, limit: int, window_ms: int) -> bool:
        now = perf_counter()
        window_s = window_ms / 1000
        bucket = store[key]
        while bucket and now - bucket[0] > window_s:
            bucket.popleft()
        if len(bucket) >= limit:
            return False
        bucket.append(now)
        # Remove the entry when empty to prevent unbounded memory growth
        if not bucket:
            store.pop(key, None)
        return True

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if not path.startswith("/api") or path == "/api/health":
            return await call_next(request)

        ip = request.client.host if request.client else "unknown"

        if path == "/api/auth/login" and request.method.upper() == "POST":
            if not self._accept(self.login_requests, ip, settings.login_rate_limit_max, settings.rate_limit_window_ms):
                log_security_event("rate_limit_exceeded", request, {"scope": "login"})
                return _api_error_response(429, "RATE_LIMITED", "Muitas tentativas de login. Aguarde e tente novamente.", request=request)

        if not self._accept(self.requests, ip, settings.rate_limit_max, settings.rate_limit_window_ms):
            log_security_event("rate_limit_exceeded", request, {"scope": "api"})
            return _api_error_response(429, "RATE_LIMITED", "Muitas requisicoes. Tente novamente em instantes.", request=request)

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
reset_enel_integration_state()
reset_sabesp_integration_state()

app = FastAPI(title="AtlasGrid API (FastAPI)", version="1.0.0")
_STARTUP_BACKGROUND_JOBS: set[asyncio.Future[Any]] = set()


def _log_oidc_startup_readiness() -> None:
    import logging  # noqa: PLC0415

    _log = logging.getLogger(__name__)
    readiness = {
        "env": settings.effective_env,
        "authProvider": settings.auth_provider,
        "oidcConfigured": settings.oidc_configured,
        "oidcReady": settings.oidc_ready,
        "missingConfig": settings.oidc_missing_fields,
        "issues": settings.oidc_readiness_issues,
    }
    if settings.effective_env != "dev" and readiness["issues"]:
        _log.warning("OIDC readiness pendente no startup: %s", readiness)
        return
    _log.info("OIDC readiness no startup: %s", readiness)


def _track_background_job(job: asyncio.Future[Any]) -> None:
    _STARTUP_BACKGROUND_JOBS.add(job)
    job.add_done_callback(_STARTUP_BACKGROUND_JOBS.discard)


async def _ingest_knowledge_base_background() -> None:
    """Index the knowledge base without blocking API readiness during startup."""
    import logging  # noqa: PLC0415

    _log = logging.getLogger(__name__)
    try:
        from app.ai.rag.vector_store import ingest_knowledge_base  # noqa: PLC0415

        n = await ingest_knowledge_base()
        if n:
            _log.info("RAG: %d chunks indexados na base de conhecimento", n)
    except Exception as exc:
        _log.warning("RAG startup ingestao falhou (ignorado): %s", exc)


def _spawn_rag_background_job() -> None:
    loop = asyncio.get_running_loop()
    job = loop.run_in_executor(None, lambda: asyncio.run(_ingest_knowledge_base_background()))
    _track_background_job(job)


@app.on_event("startup")
async def _startup_ingest_knowledge_base():
    """Start knowledge base ingestion in the background so the API becomes ready first."""
    import logging  # noqa: PLC0415

    _log = logging.getLogger(__name__)
    _log_oidc_startup_readiness()
    _spawn_rag_background_job()
    _log.info("RAG startup: ingestao agendada em background")
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(CorsAllowlistMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(ObservabilityMiddleware)
app.add_middleware(TraceIdMiddleware)
app.include_router(router)
app.include_router(contracts_router)
app.include_router(enel_router)
app.include_router(sabesp_router)
app.include_router(integration_health_router)


def reset_runtime_state() -> None:
    reset_observability_metrics()
    reset_chat_telemetry_store()
    reset_cadastros_store()
    reset_contracts_management_state()
    reset_enel_integration_state()
    reset_sabesp_integration_state()
    clear_all_memories()
    clear_chains_cache()
    reset_agent_graph()
    reset_vector_store()

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
    payload = _error_payload(exc.code, exc.message, exc.details, request=request)
    log_security_event("api_error_response", request, {"status": exc.status_code, "code": exc.code})
    record_api_error_code_metric(exc.code)
    return JSONResponse(status_code=exc.status_code, content=payload)


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception):
    payload = _error_payload("INTERNAL_ERROR", "Erro interno no servidor.", None, request=request)
    log_security_event("api_error_response", request, {"status": 500, "code": "INTERNAL_ERROR"})
    record_api_error_code_metric("INTERNAL_ERROR")
    return JSONResponse(status_code=500, content=payload)
