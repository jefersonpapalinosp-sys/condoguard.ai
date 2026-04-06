from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


def _login_headers() -> dict[str, str]:
    client = TestClient(app)
    res = client.post('/api/auth/login', json={'email': 'admin@condoguard.ai', 'password': 'password123'})
    assert res.status_code == 200
    token = res.json()['token']
    return {'Authorization': f'Bearer {token}'}


def test_alerts_and_management_contracts():
    client = TestClient(app)
    headers = _login_headers()

    alerts = client.get('/api/alerts?page=1&pageSize=5&severity=critical&sortBy=title&sortOrder=asc', headers=headers)
    assert alerts.status_code == 200
    alerts_body = alerts.json()
    assert 'items' in alerts_body and 'meta' in alerts_body and 'filters' in alerts_body and 'sort' in alerts_body

    mgmt = client.get('/api/management/units?page=1&pageSize=5&status=occupied&sortBy=block&sortOrder=asc', headers=headers)
    assert mgmt.status_code == 200
    mgmt_body = mgmt.json()
    assert 'items' in mgmt_body and 'indicators' in mgmt_body and 'meta' in mgmt_body


def test_invoices_csv_export_contract():
    client = TestClient(app)
    headers = _login_headers()

    csv_resp = client.get('/api/invoices/export.csv?status=pending&sortBy=amount&sortOrder=desc', headers=headers)
    assert csv_resp.status_code == 200
    assert csv_resp.headers.get('content-type', '').startswith('text/csv')
    text = csv_resp.text.splitlines()[0]
    assert '"id"' in text and '"status"' in text
