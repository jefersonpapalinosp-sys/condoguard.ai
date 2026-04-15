from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from pathlib import Path

from app.core.config import settings
from app.core.security import create_access_token
from app.integrations.sabesp.repository import reset_sabesp_integration_state
from app.main import app


@pytest.fixture(autouse=True)
def setup_sabesp_integration_state(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    reset_sabesp_integration_state()
    monkeypatch.setattr(settings, "db_dialect", "mock", raising=False)
    monkeypatch.setattr(settings, "allow_oracle_seed_fallback", True, raising=False)
    monkeypatch.setattr(settings, "security_audit_persist_enabled", True, raising=False)
    monkeypatch.setattr(settings, "security_audit_log_path", str(tmp_path / "security-audit-sabesp.log"), raising=False)
    yield
    reset_sabesp_integration_state()


def _login_headers(email: str = "admin@atlasgrid.ai", password: str = "password123") -> dict[str, str]:
    client = TestClient(app)
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    token = res.json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_sabesp_runs_create_list_detail_and_consumption_snapshot():
    client = TestClient(app)
    headers = _login_headers()

    created = client.post(
        "/api/integrations/sabesp/runs",
        headers=headers,
        json={
            "source": "manual_assisted",
            "notes": "Carga assistida Sabesp sprint 10",
            "items": [
                {
                    "externalReference": "SAB-APR-001",
                    "unit": "A-101",
                    "resident": "Maria Silva",
                    "reference": "04/2026",
                    "readingDate": "2026-04-08",
                    "dueDate": "2026-04-20",
                    "consumptionM3": 38.4,
                    "amount": 214.90,
                    "status": "pending",
                    "documentHash": "sab-hash-apr-001",
                },
                {
                    "externalReference": "SAB-APR-002",
                    "unit": "A-101",
                    "resident": "Maria Silva",
                    "reference": "04/2026",
                    "readingDate": "2026-04-08",
                    "dueDate": "2026-04-20",
                    "consumptionM3": 38.4,
                    "amount": 214.90,
                    "status": "pending",
                    "documentHash": "sab-hash-apr-002",
                },
                {
                    "externalReference": "SAB-APR-003",
                    "unit": "A-102",
                    "readingDate": "data-invalida",
                    "dueDate": "2026-04-20",
                    "consumptionM3": 10.0,
                    "amount": 120.00,
                },
            ],
        },
    )
    assert created.status_code == 201
    run = created.json()["run"]
    assert run["status"] == "completed_with_errors"
    assert run["summary"] == {"total": 3, "imported": 1, "skipped": 1, "failed": 1}
    assert len(run["items"]) == 3

    listing = client.get("/api/integrations/sabesp/runs?page=1&pageSize=10&status=completed_with_errors", headers=headers)
    assert listing.status_code == 200
    body = listing.json()
    assert len(body["items"]) == 1
    assert body["items"][0]["runId"] == run["runId"]

    detail = client.get(f"/api/integrations/sabesp/runs/{run['runId']}", headers=headers)
    assert detail.status_code == 200
    detail_run = detail.json()["run"]
    assert detail_run["runId"] == run["runId"]
    assert len(detail_run["items"]) == 3

    consumption = client.get("/api/consumption", headers=headers)
    assert consumption.status_code == 200
    payload = consumption.json()
    imported = [item for item in payload.get("anomalies", []) if str(item.get("id", "")).startswith("sabesp-snapshot-")]
    assert len(imported) >= 1
    assert any("A-101" in str(item.get("title") or "") for item in imported)


def test_sabesp_runs_rbac_forbidden_for_morador():
    client = TestClient(app)
    morador_headers = _login_headers("morador@atlasgrid.ai")

    forbidden_list = client.get("/api/integrations/sabesp/runs", headers=morador_headers)
    assert forbidden_list.status_code == 403
    assert forbidden_list.json()["error"]["code"] == "FORBIDDEN"

    forbidden_create = client.post(
        "/api/integrations/sabesp/runs",
        headers=morador_headers,
        json={
            "source": "manual_assisted",
            "items": [
                {
                    "unit": "A-101",
                    "readingDate": "2026-04-08",
                    "dueDate": "2026-04-20",
                    "consumptionM3": 10,
                    "amount": 10,
                }
            ],
        },
    )
    assert forbidden_create.status_code == 403
    assert forbidden_create.json()["error"]["code"] == "FORBIDDEN"


def test_sabesp_runs_are_isolated_by_tenant_scope():
    client = TestClient(app)
    tenant1_headers = _login_headers()
    tenant2_token, _ = create_access_token({"sub": "admin-tenant2@atlasgrid.ai", "role": "admin", "condominium_id": 2})
    tenant2_headers = {"Authorization": f"Bearer {tenant2_token}"}

    tenant1_create = client.post(
        "/api/integrations/sabesp/runs",
        headers=tenant1_headers,
        json={
            "source": "manual_assisted",
            "items": [
                {
                    "externalReference": "SAB-T1-001",
                    "unit": "A-101",
                    "reference": "04/2026",
                    "readingDate": "2026-04-08",
                    "dueDate": "2026-04-20",
                    "consumptionM3": 30,
                    "amount": 120,
                    "documentHash": "sabesp-tenant-1-hash",
                }
            ],
        },
    )
    assert tenant1_create.status_code == 201
    tenant1_run_id = tenant1_create.json()["run"]["runId"]

    tenant2_list = client.get("/api/integrations/sabesp/runs", headers=tenant2_headers)
    assert tenant2_list.status_code == 200
    assert tenant2_list.json()["items"] == []

    tenant2_detail = client.get(f"/api/integrations/sabesp/runs/{tenant1_run_id}", headers=tenant2_headers)
    assert tenant2_detail.status_code == 404
    assert tenant2_detail.json()["error"]["code"] == "NOT_FOUND"
    tenant2_audit = client.get(
        "/api/security/audit?event=integration_cross_tenant_run_access_denied",
        headers=tenant2_headers,
    )
    assert tenant2_audit.status_code == 200
    tenant2_audit_items = tenant2_audit.json()["items"]
    assert len(tenant2_audit_items) == 1
    assert tenant2_audit_items[0]["provider"] == "sabesp"
    assert tenant2_audit_items[0]["targetRunId"] == tenant1_run_id
    assert tenant2_audit_items[0]["resourceType"] == "integration_run"
    assert tenant2_audit_items[0]["condominiumId"] == 2

    tenant2_create = client.post(
        "/api/integrations/sabesp/runs",
        headers=tenant2_headers,
        json={
            "source": "manual_assisted",
            "items": [
                {
                    "externalReference": "SAB-T2-001",
                    "unit": "A-101",
                    "reference": "05/2026",
                    "readingDate": "2026-05-08",
                    "dueDate": "2026-05-20",
                    "consumptionM3": 35,
                    "amount": 180,
                    "documentHash": "sabesp-tenant-2-hash",
                }
            ],
        },
    )
    assert tenant2_create.status_code == 201
    tenant2_run_id = tenant2_create.json()["run"]["runId"]

    tenant1_runs = client.get("/api/integrations/sabesp/runs", headers=tenant1_headers).json()["items"]
    tenant2_runs = client.get("/api/integrations/sabesp/runs", headers=tenant2_headers).json()["items"]

    assert [item["runId"] for item in tenant1_runs] == [tenant1_run_id]
    assert [item["runId"] for item in tenant2_runs] == [tenant2_run_id]
