from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


def login(client: TestClient) -> str:
    res = client.post('/api/auth/login', json={'email': 'admin@atlasgrid.ai', 'password': 'password123'})
    assert res.status_code == 200
    return res.json()['token']


def test_auth_and_invoices_contract():
    client = TestClient(app)
    token = login(client)
    headers = {'Authorization': f'Bearer {token}'}

    res = client.get('/api/invoices?page=1&pageSize=5', headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert 'items' in body and 'meta' in body and 'filters' in body and 'sort' in body


def test_protected_requires_token():
    client = TestClient(app)
    res = client.get('/api/invoices?page=1&pageSize=5')
    assert res.status_code == 401
    assert res.json()['error']['code'] == 'AUTH_REQUIRED'
