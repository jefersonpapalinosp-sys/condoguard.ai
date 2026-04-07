from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.integrations.enel.repository import reset_enel_integration_state
from app.main import app


@pytest.fixture(autouse=True)
def setup_enel_integration_state(monkeypatch: pytest.MonkeyPatch):
    reset_enel_integration_state()
    monkeypatch.setattr(settings, "db_dialect", "mock", raising=False)
    monkeypatch.setattr(settings, "allow_oracle_seed_fallback", True, raising=False)
    yield
    reset_enel_integration_state()


def _login_headers(email: str = "admin@condoguard.ai", password: str = "password123") -> dict[str, str]:
    client = TestClient(app)
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    token = res.json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_enel_runs_create_list_detail_and_invoice_snapshot():
    client = TestClient(app)
    headers = _login_headers()

    created = client.post(
        "/api/integrations/enel/runs",
        headers=headers,
        json={
            "source": "manual_assisted",
            "notes": "Carga assistida sprint 9",
            "items": [
                {
                    "externalReference": "ENEL-APR-001",
                    "unit": "A-101",
                    "resident": "Maria Silva",
                    "reference": "04/2026",
                    "dueDate": "2026-04-10",
                    "amount": 320.75,
                    "status": "pending",
                    "documentHash": "hash-apr-001",
                },
                {
                    "externalReference": "ENEL-APR-002",
                    "unit": "A-101",
                    "resident": "Maria Silva",
                    "reference": "04/2026",
                    "dueDate": "2026-04-10",
                    "amount": 320.75,
                    "status": "pending",
                    "documentHash": "hash-apr-002",
                },
                {
                    "externalReference": "ENEL-APR-003",
                    "unit": "A-102",
                    "dueDate": "data-invalida",
                    "amount": 150.00,
                },
            ],
        },
    )
    assert created.status_code == 201
    run = created.json()["run"]
    assert run["status"] == "completed_with_errors"
    assert run["summary"] == {"total": 3, "imported": 1, "skipped": 1, "failed": 1}
    assert len(run["items"]) == 3

    listing = client.get("/api/integrations/enel/runs?page=1&pageSize=10&status=completed_with_errors", headers=headers)
    assert listing.status_code == 200
    body = listing.json()
    assert len(body["items"]) == 1
    assert body["items"][0]["runId"] == run["runId"]

    detail = client.get(f"/api/integrations/enel/runs/{run['runId']}", headers=headers)
    assert detail.status_code == 200
    detail_run = detail.json()["run"]
    assert detail_run["runId"] == run["runId"]
    assert len(detail_run["items"]) == 3

    invoices = client.get("/api/invoices?page=1&pageSize=200", headers=headers)
    assert invoices.status_code == 200
    imported = [item for item in invoices.json()["items"] if str(item.get("id", "")).startswith("enel-snapshot-")]
    assert len(imported) >= 1
    assert any(item["unit"] == "A-101" and item["reference"] == "04/2026" for item in imported)


def test_enel_runs_rbac_forbidden_for_morador():
    client = TestClient(app)
    morador_headers = _login_headers("morador@condoguard.ai")

    forbidden_list = client.get("/api/integrations/enel/runs", headers=morador_headers)
    assert forbidden_list.status_code == 403
    assert forbidden_list.json()["error"]["code"] == "FORBIDDEN"

    forbidden_create = client.post(
        "/api/integrations/enel/runs",
        headers=morador_headers,
        json={"source": "manual_assisted", "items": [{"unit": "A-101", "dueDate": "2026-04-10", "amount": 10}]},
    )
    assert forbidden_create.status_code == 403
    assert forbidden_create.json()["error"]["code"] == "FORBIDDEN"

