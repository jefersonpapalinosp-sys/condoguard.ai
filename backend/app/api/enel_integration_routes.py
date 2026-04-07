from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query

from app.api.helpers import parse_enum, parse_positive_int
from app.core.errors import ApiRequestError
from app.core.security import require_roles, require_tenant_scope
from app.integrations.enel.orchestrator import run_enel_assisted_import
from app.integrations.enel.repository import get_enel_run_detail, list_enel_runs
from app.schemas.requests import EnelRunCreateBody

enel_router = APIRouter(prefix="/api/integrations/enel")

RUN_STATUSES = ["processing", "completed", "completed_with_errors", "failed"]


@enel_router.post("/runs", status_code=201)
async def create_enel_run(
    body: EnelRunCreateBody,
    auth: dict[str, Any] = Depends(require_tenant_scope),
    _role: dict[str, Any] = Depends(require_roles(["admin", "sindico"])),
):
    payload = body.model_dump()
    run = await run_enel_assisted_import(auth["condominiumId"], auth.get("sub"), payload)
    return {"run": run}


@enel_router.get("/runs")
async def list_enel_runs_endpoint(
    auth: dict[str, Any] = Depends(require_tenant_scope),
    _role: dict[str, Any] = Depends(require_roles(["admin", "sindico"])),
    page: int = Query(default=1),
    pageSize: int = Query(default=20),
    status: str | None = Query(default=None),
):
    safe_page = parse_positive_int(page, 1, "page")
    safe_page_size = parse_positive_int(pageSize, 20, "pageSize")
    safe_status = parse_enum(status, RUN_STATUSES, "status")
    return await list_enel_runs(auth["condominiumId"], safe_page, safe_page_size, safe_status)


@enel_router.get("/runs/{run_id}")
async def get_enel_run_detail_endpoint(
    run_id: str,
    auth: dict[str, Any] = Depends(require_tenant_scope),
    _role: dict[str, Any] = Depends(require_roles(["admin", "sindico"])),
):
    safe_id = str(run_id or "").strip()
    if not safe_id:
        raise ApiRequestError(400, "INVALID_QUERY_PARAM", "run_id e obrigatorio.", {"field": "run_id"})

    run = await get_enel_run_detail(auth["condominiumId"], safe_id)
    if not run:
        raise ApiRequestError(404, "NOT_FOUND", "Execucao de integracao nao encontrada.")
    return {"run": run}

