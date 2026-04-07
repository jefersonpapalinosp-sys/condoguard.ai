from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.main import app
from app.observability.metrics_store import reset_observability_metrics
from app.repositories.chat_telemetry_repo import reset_chat_telemetry_store


ROOT = Path(__file__).resolve().parents[2]
INVOICE_STATE_FILE = ROOT / "server" / "data" / "invoices_status_state.json"
ALERTS_STATE_FILE = ROOT / "server" / "data" / "alerts_reads_state.json"


@pytest.fixture(autouse=True)
def reset_runtime_state():
    for file in (INVOICE_STATE_FILE, ALERTS_STATE_FILE):
        try:
            file.unlink()
        except FileNotFoundError:
            pass
    reset_observability_metrics()
    reset_chat_telemetry_store()
    yield


def _login_headers(email: str = "admin@condoguard.ai", password: str = "password123") -> dict[str, str]:
    client = TestClient(app)
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['token']}"}


def test_invoices_pay_and_csv_export_contract():
    client = TestClient(app)
    headers = _login_headers()

    listing = client.get("/api/invoices?page=1&pageSize=20", headers=headers)
    assert listing.status_code == 200
    items = listing.json()["items"]
    assert len(items) > 0
    invoice_id = items[0]["id"]

    paid = client.patch(f"/api/invoices/{invoice_id}/pay", headers=headers, json={})
    assert paid.status_code == 200
    assert paid.json()["item"]["status"] == "paid"

    csv_res = client.get("/api/invoices/export.csv?sortBy=amount&sortOrder=desc", headers=headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers.get("content-type", "")
    assert '"id","condominiumId","unit","resident","reference","dueDate","amount","status"' in csv_res.text


def test_alerts_mark_as_read_flow():
    client = TestClient(app)
    headers = _login_headers()

    alerts = client.get("/api/alerts?page=1&pageSize=1", headers=headers)
    assert alerts.status_code == 200
    alert_id = alerts.json()["items"][0]["id"]

    mark = client.patch(f"/api/alerts/{alert_id}/read", headers=headers, json={})
    assert mark.status_code == 200
    assert mark.json()["item"]["status"] == "read"


def test_chat_telemetry_rbac_matrix():
    client = TestClient(app)
    admin = _login_headers("admin@condoguard.ai")
    sindico = _login_headers("sindico@condoguard.ai")
    morador = _login_headers("morador@condoguard.ai")

    assert client.get("/api/chat/telemetry", headers=admin).status_code == 200
    assert client.get("/api/chat/telemetry", headers=sindico).status_code == 200

    forbidden = client.get("/api/chat/telemetry", headers=morador)
    assert forbidden.status_code == 403
    assert forbidden.json()["error"]["code"] == "FORBIDDEN"


def test_observability_metrics_admin_only():
    client = TestClient(app)
    admin = _login_headers("admin@condoguard.ai")
    morador = _login_headers("morador@condoguard.ai")

    assert client.get("/api/health").status_code == 200
    assert client.get("/api/invoices", headers=admin).status_code == 200
    assert client.get("/api/invoices", headers=morador).status_code == 403

    metrics = client.get("/api/observability/metrics?routeLimit=5&codeLimit=5", headers=admin)
    assert metrics.status_code == 200
    payload = metrics.json()
    assert "counters" in payload and "latency" in payload and "statusClasses" in payload
    assert len(payload["topRoutes"]) > 0

    forbidden = client.get("/api/observability/metrics", headers=morador)
    assert forbidden.status_code == 403
    assert forbidden.json()["error"]["code"] == "FORBIDDEN"


def test_observability_alerts_admin_only():
    client = TestClient(app)
    admin = _login_headers("admin@condoguard.ai")
    sindico = _login_headers("sindico@condoguard.ai")

    alerts = client.get("/api/observability/alerts", headers=admin)
    assert alerts.status_code == 200
    assert "items" in alerts.json()

    forbidden = client.get("/api/observability/alerts", headers=sindico)
    assert forbidden.status_code == 403
    assert forbidden.json()["error"]["code"] == "FORBIDDEN"


def test_invalid_filters_return_standardized_400():
    client = TestClient(app)
    headers = _login_headers()

    bad_invoice_enum = client.get("/api/invoices?status=invalid-status", headers=headers)
    assert bad_invoice_enum.status_code == 400
    assert bad_invoice_enum.json()["error"]["code"] == "INVALID_ENUM_VALUE"

    bad_alert_page = client.get("/api/alerts?page=0", headers=headers)
    assert bad_alert_page.status_code == 400
    assert bad_alert_page.json()["error"]["code"] == "INVALID_QUERY_PARAM"


def test_cadastros_filters_contract():
    client = TestClient(app)
    headers = _login_headers()

    response = client.get("/api/cadastros?tipo=unidade&status=active&search=a&page=1&pageSize=20", headers=headers)
    assert response.status_code == 200
    payload = response.json()

    assert "items" in payload and "meta" in payload and "filters" in payload
    assert payload["filters"]["tipo"] == "unidade"
    assert payload["filters"]["status"] == "active"
    assert payload["meta"]["page"] == 1
    assert payload["meta"]["pageSize"] == 20

    for item in payload["items"]:
        assert item["tipo"] == "unidade"
        assert item["status"] == "active"


def test_tenant_scope_protection_and_isolation():
    client = TestClient(app)

    no_scope_token, _ = create_access_token({"sub": "admin@condoguard.ai", "role": "admin"})
    no_scope = client.get("/api/invoices", headers={"Authorization": f"Bearer {no_scope_token}"})
    assert no_scope.status_code == 401
    assert no_scope.json()["error"]["code"] == "INVALID_TENANT_SCOPE"

    tenant2_token, _ = create_access_token({"sub": "admin@condoguard.ai", "role": "admin", "condominium_id": 2})
    tenant2_headers = {"Authorization": f"Bearer {tenant2_token}"}
    invoices = client.get("/api/invoices", headers=tenant2_headers)
    management = client.get("/api/management/units", headers=tenant2_headers)
    alerts = client.get("/api/alerts", headers=tenant2_headers)

    assert invoices.status_code == 200
    assert management.status_code == 200
    assert alerts.status_code == 200

    invoice_items = invoices.json()["items"]
    management_items = management.json()["items"]
    alert_items = alerts.json()["items"]

    assert all(item.get("condominiumId") == 2 for item in invoice_items)
    assert all(item.get("condominiumId") == 2 for item in management_items)
    assert all(item.get("condominiumId") == 2 for item in alert_items)


def test_security_audit_role_and_invalid_range():
    client = TestClient(app)
    admin = _login_headers("admin@condoguard.ai")
    morador = _login_headers("morador@condoguard.ai")

    forbidden = client.get("/api/security/audit", headers=morador)
    assert forbidden.status_code == 403
    assert forbidden.json()["error"]["code"] == "FORBIDDEN"

    invalid_range = client.get(
        "/api/security/audit?from=2026-04-05T00:00:00.000Z&to=2026-04-04T00:00:00.000Z",
        headers=admin,
    )
    assert invalid_range.status_code == 400
    assert invalid_range.json()["error"]["code"] == "INVALID_QUERY_PARAM"
