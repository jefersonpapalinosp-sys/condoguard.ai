from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.core.errors import ApiRequestError
from app.core.security import AUTH_ROLES, require_roles, require_tenant_scope
from app.repositories.contracts_management_repo import (
    attach_contract_document_data,
    close_contract_data,
    create_contract_data,
    get_contract_detail_data,
    get_contracts_adjustments_data,
    get_contracts_audit_data,
    get_contracts_dashboard_data,
    get_contracts_expiring_data,
    get_contracts_list_data,
    list_contract_documents_data,
    remove_contract_document_data,
    renew_contract_data,
    update_contract_data,
)
from app.schemas.requests import ContractCreateBody, ContractDocumentCreateBody, ContractUpdateBody

contracts_router = APIRouter(prefix="/api/contracts")


def _parse_bool_query(value: str | None) -> bool:
    if value is None:
        return False
    return str(value).strip().lower() in {"1", "true", "yes", "sim"}


@contracts_router.get("/dashboard")
async def contracts_dashboard(auth: dict = Depends(require_tenant_scope), _role: dict = Depends(require_roles(AUTH_ROLES))):
    return await get_contracts_dashboard_data(auth["condominiumId"])


@contracts_router.get("/lista")
async def contracts_list(
    auth: dict = Depends(require_tenant_scope),
    _role: dict = Depends(require_roles(AUTH_ROLES)),
    page: int = Query(default=1),
    pageSize: int = Query(default=20),
    status: str | None = Query(default=None),
    supplier: str | None = Query(default=None),
    serviceType: str | None = Query(default=None),
    index: str | None = Query(default=None),
    expiringOnly: str | None = Query(default=None),
    risk: str | None = Query(default=None),
    search: str | None = Query(default=None),
    sortBy: str | None = Query(default=None),
    sortOrder: str | None = Query(default=None),
):
    return await get_contracts_list_data(
        auth["condominiumId"],
        {
            "page": page,
            "pageSize": pageSize,
            "status": status,
            "supplier": supplier,
            "serviceType": serviceType,
            "index": index,
            "expiringOnly": _parse_bool_query(expiringOnly),
            "risk": risk,
            "search": search,
            "sortBy": sortBy,
            "sortOrder": sortOrder,
        },
    )


@contracts_router.get("/auditoria")
async def contracts_audit(
    auth: dict = Depends(require_tenant_scope),
    _role: dict = Depends(require_roles(AUTH_ROLES)),
    search: str | None = Query(default=None),
    risk: str | None = Query(default=None),
    index: str | None = Query(default=None),
):
    return await get_contracts_audit_data(auth["condominiumId"], {"search": search, "risk": risk, "index": index})


@contracts_router.get("/vencimentos")
async def contracts_expiring(auth: dict = Depends(require_tenant_scope), _role: dict = Depends(require_roles(AUTH_ROLES))):
    return await get_contracts_expiring_data(auth["condominiumId"])


@contracts_router.get("/reajustes")
async def contracts_adjustments(auth: dict = Depends(require_tenant_scope), _role: dict = Depends(require_roles(AUTH_ROLES))):
    return await get_contracts_adjustments_data(auth["condominiumId"])


@contracts_router.get("/documentos")
async def contracts_documents(
    auth: dict = Depends(require_tenant_scope),
    _role: dict = Depends(require_roles(AUTH_ROLES)),
    contractId: str | None = Query(default=None),
):
    return await list_contract_documents_data(auth["condominiumId"], contractId)


@contracts_router.post("/documentos/{contract_id}", status_code=201)
async def contracts_document_attach(
    contract_id: str,
    body: ContractDocumentCreateBody,
    auth: dict = Depends(require_tenant_scope),
    _role: dict = Depends(require_roles(["admin", "sindico"])),
):
    created = await attach_contract_document_data(auth["condominiumId"], contract_id, body.model_dump(), auth.get("sub"))
    if not created:
        raise ApiRequestError(404, "NOT_FOUND", "Contrato nao encontrado.")
    return {"item": created}


@contracts_router.delete("/documentos/{document_id}")
async def contracts_document_remove(
    document_id: str,
    auth: dict = Depends(require_tenant_scope),
    _role: dict = Depends(require_roles(["admin", "sindico"])),
):
    removed = await remove_contract_document_data(auth["condominiumId"], document_id, auth.get("sub"))
    if not removed:
        raise ApiRequestError(404, "NOT_FOUND", "Documento nao encontrado.")
    return {"ok": True}


@contracts_router.post("", status_code=201)
async def contracts_create(
    body: ContractCreateBody,
    auth: dict = Depends(require_tenant_scope),
    _role: dict = Depends(require_roles(["admin", "sindico"])),
):
    created = await create_contract_data(auth["condominiumId"], body.model_dump(), auth.get("sub"))
    return {"item": created}


@contracts_router.post("/{contract_id}/renew")
async def contracts_renew(
    contract_id: str,
    auth: dict = Depends(require_tenant_scope),
    _role: dict = Depends(require_roles(["admin", "sindico"])),
):
    updated = await renew_contract_data(auth["condominiumId"], contract_id, auth.get("sub"))
    if not updated:
        raise ApiRequestError(404, "NOT_FOUND", "Contrato nao encontrado.")
    return {"item": updated}


@contracts_router.post("/{contract_id}/close")
async def contracts_close(
    contract_id: str,
    auth: dict = Depends(require_tenant_scope),
    _role: dict = Depends(require_roles(["admin", "sindico"])),
):
    updated = await close_contract_data(auth["condominiumId"], contract_id, auth.get("sub"))
    if not updated:
        raise ApiRequestError(404, "NOT_FOUND", "Contrato nao encontrado.")
    return {"item": updated}


@contracts_router.get("/{contract_id}")
async def contracts_detail(contract_id: str, auth: dict = Depends(require_tenant_scope), _role: dict = Depends(require_roles(AUTH_ROLES))):
    details = await get_contract_detail_data(auth["condominiumId"], contract_id)
    if not details:
        raise ApiRequestError(404, "NOT_FOUND", "Contrato nao encontrado.")
    return details


@contracts_router.patch("/{contract_id}")
async def contracts_update(
    contract_id: str,
    body: ContractUpdateBody,
    auth: dict = Depends(require_tenant_scope),
    _role: dict = Depends(require_roles(["admin", "sindico"])),
):
    updated = await update_contract_data(auth["condominiumId"], contract_id, body.model_dump(exclude_none=True), auth.get("sub"))
    if not updated:
        raise ApiRequestError(404, "NOT_FOUND", "Contrato nao encontrado.")
    return {"item": updated}

