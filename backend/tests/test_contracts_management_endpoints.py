from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


def _login_headers() -> dict[str, str]:
    client = TestClient(app)
    res = client.post("/api/auth/login", json={"email": "admin@atlasgrid.ai", "password": "password123"})
    assert res.status_code == 200
    token = res.json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_contracts_management_dashboard_list_and_detail_contracts():
    client = TestClient(app)
    headers = _login_headers()

    dashboard = client.get("/api/contracts/dashboard", headers=headers)
    assert dashboard.status_code == 200
    dashboard_body = dashboard.json()
    assert "metrics" in dashboard_body and "highlights" in dashboard_body

    listing = client.get("/api/contracts/lista?page=1&pageSize=10&sortBy=monthlyValue&sortOrder=desc", headers=headers)
    assert listing.status_code == 200
    body = listing.json()
    assert "items" in body and "meta" in body and "facets" in body
    assert len(body["items"]) > 0

    contract_id = body["items"][0]["id"]
    detail = client.get(f"/api/contracts/{contract_id}", headers=headers)
    assert detail.status_code == 200
    detail_body = detail.json()
    assert "item" in detail_body and "timeline" in detail_body and "documents" in detail_body


def test_contracts_management_create_update_actions_and_documents():
    client = TestClient(app)
    headers = _login_headers()

    created = client.post(
        "/api/contracts",
        headers=headers,
        json={
            "contractNumber": "CTR-NEW-001",
            "name": "Contrato de jardinagem",
            "supplier": "Green Garden Ltda",
            "category": "Paisagismo",
            "description": "Manutencao de jardins e poda preventiva.",
            "serviceType": "Paisagismo e jardinagem",
            "startDate": "2026-04-01",
            "endDate": "2027-03-31",
            "termMonths": 12,
            "monthlyValue": 5600,
            "index": "IPCA",
            "adjustmentFrequencyMonths": 12,
            "nextAdjustmentDate": "2027-03-31",
            "internalOwner": "Carlos Pereira",
            "status": "active",
            "risk": "low",
            "notes": "Contrato inicial para area verde.",
        },
    )
    assert created.status_code == 201
    item = created.json()["item"]
    contract_id = item["id"]

    updated = client.patch(
        f"/api/contracts/{contract_id}",
        headers=headers,
        json={"status": "renewal_pending", "risk": "medium", "notes": "Revisar clausulas de SLA."},
    )
    assert updated.status_code == 200
    assert updated.json()["item"]["status"] == "renewal_pending"

    renewed = client.post(f"/api/contracts/{contract_id}/renew", headers=headers, json={})
    assert renewed.status_code == 200
    assert renewed.json()["item"]["renewalStatus"] == "renewed"

    closed = client.post(f"/api/contracts/{contract_id}/close", headers=headers, json={})
    assert closed.status_code == 200
    assert closed.json()["item"]["status"] == "closed"

    attached = client.post(
        f"/api/contracts/documentos/{contract_id}",
        headers=headers,
        json={"name": "aditivo-2026.pdf", "type": "aditivo", "sizeKb": 220.5, "status": "active"},
    )
    assert attached.status_code == 201
    document_id = attached.json()["item"]["id"]

    docs = client.get(f"/api/contracts/documentos?contractId={contract_id}", headers=headers)
    assert docs.status_code == 200
    docs_body = docs.json()
    assert "items" in docs_body and len(docs_body["items"]) >= 1

    removed = client.delete(f"/api/contracts/documentos/{document_id}", headers=headers)
    assert removed.status_code == 200
    assert removed.json()["ok"] is True

