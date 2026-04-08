from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app


def _login_headers(email: str = "admin@condoguard.ai", password: str = "password123") -> dict[str, str]:
    client = TestClient(app)
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['token']}"}


def test_cors_preflight_returns_204_without_body():
    client = TestClient(app)
    response = client.options(
        "/api/auth/login",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert response.status_code == 204
    assert response.text == ""
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"


def test_cors_denied_origin_returns_403():
    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/api/health", headers={"Origin": "https://evil.example"})
    assert response.status_code == 403
    body = response.json()
    assert body["error"]["code"] == "CORS_DENIED"


def test_security_headers_present_on_health():
    client = TestClient(app)
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.headers.get("x-content-type-options") == "nosniff"
    assert response.headers.get("x-frame-options") == "DENY"
    assert response.headers.get("referrer-policy") == "strict-origin-when-cross-origin"


def test_trace_id_is_exposed_on_success_and_error_responses():
    client = TestClient(app, raise_server_exceptions=False)

    health = client.get("/api/health", headers={"X-Trace-Id": "test-trace-health"})
    assert health.status_code == 200
    assert health.headers.get("x-trace-id") == "test-trace-health"

    protected = client.get("/api/invoices")
    assert protected.status_code == 401
    assert protected.headers.get("x-trace-id")
    assert protected.json()["error"]["traceId"] == protected.headers.get("x-trace-id")


def test_auth_login_disabled_by_external_provider_flag():
    client = TestClient(app)
    previous = settings.auth_password_login_enabled
    settings.auth_password_login_enabled = False
    try:
        response = client.post("/api/auth/login", json={"email": "admin@condoguard.ai", "password": "password123"})
        assert response.status_code == 501
        assert response.json()["error"]["code"] == "AUTH_EXTERNAL_PROVIDER_REQUIRED"
    finally:
        settings.auth_password_login_enabled = previous


def test_audit_endpoint_is_admin_only():
    client = TestClient(app)
    admin_headers = _login_headers("admin@condoguard.ai")
    resident_headers = _login_headers("morador@condoguard.ai")

    forbidden = client.get("/api/security/audit", headers=resident_headers)
    assert forbidden.status_code == 403
    assert forbidden.json()["error"]["code"] == "FORBIDDEN"

    allowed = client.get("/api/security/audit", headers=admin_headers)
    assert allowed.status_code == 200
    body = allowed.json()
    assert "items" in body and "meta" in body and "filters" in body
