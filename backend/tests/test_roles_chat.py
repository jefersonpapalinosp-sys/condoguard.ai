from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


def _login(email: str) -> tuple[TestClient, dict[str, str]]:
    client = TestClient(app)
    res = client.post('/api/auth/login', json={'email': email, 'password': 'password123'})
    assert res.status_code == 200
    token = res.json()['token']
    return client, {'Authorization': f'Bearer {token}'}


def test_role_forbidden_on_observability_for_sindico():
    client, headers = _login('sindico@condoguard.ai')
    res = client.get('/api/observability/metrics', headers=headers)
    assert res.status_code == 403
    assert res.json()['error']['code'] == 'FORBIDDEN'


def test_chat_feedback_and_telemetry():
    client, headers = _login('admin@condoguard.ai')
    msg = client.post('/api/chat/message', json={'message': 'Resumo financeiro'}, headers=headers)
    assert msg.status_code == 200
    message_id = msg.json()['id']

    fb = client.post('/api/chat/feedback', json={'messageId': message_id, 'rating': 'up'}, headers=headers)
    assert fb.status_code == 201
    tel = client.get('/api/chat/telemetry?limit=5', headers=headers)
    assert tel.status_code == 200
    assert tel.json()['satisfaction']['total'] >= 1
