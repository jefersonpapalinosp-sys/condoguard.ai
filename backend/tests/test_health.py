from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


def test_health():
    client = TestClient(app)
    resp = client.get('/api/health')
    assert resp.status_code == 200
    body = resp.json()
    assert body['ok'] is True
    assert body['service'] == 'atlasgrid-api'
    assert 'oidcReadiness' in body
    assert 'ready' in body['oidcReadiness']
    assert 'missingConfig' in body['oidcReadiness']
    assert 'issues' in body['oidcReadiness']
