from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.errors import ApiRequestError
from app.main import app


def _login_headers() -> dict[str, str]:
    client = TestClient(app)
    res = client.post('/api/auth/login', json={'email': 'admin@atlasgrid.ai', 'password': 'password123'})
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


def test_management_indicators_when_cadastros_unavailable(monkeypatch):
    client = TestClient(app)
    headers = _login_headers()

    async def _raise_oracle_unavailable(*_args, **_kwargs):
        raise ApiRequestError(
            503,
            'ORACLE_UNAVAILABLE',
            'Oracle indisponivel para este ambiente.',
            {'fallbackAllowed': False},
        )

    monkeypatch.setattr('app.api.routes.list_cadastros', _raise_oracle_unavailable)

    mgmt = client.get('/api/management/units?page=1&pageSize=20', headers=headers)
    assert mgmt.status_code == 200
    indicators = mgmt.json()['indicators']['pending']
    assert indicators['cadastrosPending'] == 0
    assert indicators['pendingCount'] == indicators['maintenanceCount']


def test_invoices_csv_export_contract():
    client = TestClient(app)
    headers = _login_headers()

    csv_resp = client.get('/api/invoices/export.csv?status=pending&sortBy=amount&sortOrder=desc', headers=headers)
    assert csv_resp.status_code == 200
    assert csv_resp.headers.get('content-type', '').startswith('text/csv')
    text = csv_resp.text.splitlines()[0]
    assert '"id"' in text and '"status"' in text


def test_dashboard_consumption_contracts_reports_endpoints():
    client = TestClient(app)
    headers = _login_headers()

    dashboard = client.get('/api/dashboard', headers=headers)
    assert dashboard.status_code == 200
    dashboard_body = dashboard.json()
    assert 'metrics' in dashboard_body and 'recentAlerts' in dashboard_body

    consumption = client.get('/api/consumption', headers=headers)
    assert consumption.status_code == 200
    consumption_body = consumption.json()
    assert 'kpis' in consumption_body and 'anomalies' in consumption_body

    contracts = client.get('/api/contracts', headers=headers)
    assert contracts.status_code == 200
    contracts_body = contracts.json()
    assert 'estimatedQuarterImpact' in contracts_body and 'items' in contracts_body

    reports = client.get('/api/reports', headers=headers)
    assert reports.status_code == 200
    reports_body = reports.json()
    assert 'executiveTitle' in reports_body and 'items' in reports_body

    settings = client.get('/api/settings', headers=headers)
    assert settings.status_code == 200
    settings_body = settings.json()
    assert 'platform' in settings_body and 'security' in settings_body and 'observability' in settings_body
    assert 'oidcMissingConfig' in settings_body['platform']
    assert 'oidcIssues' in settings_body['platform']
