from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import Request

from app.audit.security_audit import persist_security_event
from app.core.config import settings


logger = logging.getLogger("atlasgrid.api")


def configure_logging() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def log_security_event(event: str, request: Request | None, details: dict[str, Any] | None = None) -> None:
    if not settings.security_audit_log_enabled:
        return

    auth = getattr(request.state, "auth", None) if request else None
    payload: dict[str, Any] = {
        "ts": now_iso(),
        "event": event,
        "traceId": getattr(request.state, "trace_id", None) if request else None,
        "method": request.method if request else None,
        "path": request.url.path if request else None,
        "ip": request.client.host if request and request.client else None,
        "userAgent": request.headers.get("user-agent") if request else None,
        "actorSub": auth.get("sub") if isinstance(auth, dict) else None,
        "actorRole": auth.get("role") if isinstance(auth, dict) else None,
        "condominiumId": auth.get("condominiumId") if isinstance(auth, dict) else None,
    }
    payload.update(details or {})
    logger.info("[security] %s", payload)
    persist_security_event(payload)
