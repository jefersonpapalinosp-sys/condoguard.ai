# Backend FastAPI (Migração do Node/Express)

## Estrutura

- `app/main.py`: app FastAPI, middlewares e handlers globais
- `app/api/routes.py`: endpoints `/api/*` compatíveis com o frontend atual
- `app/core/*`: config, segurança e erros padronizados
- `app/repositories/*`: acesso mock/Oracle, telemetria e dados
- `app/services/*`: contexto de chat e dispatch de alertas de observabilidade
- `app/observability/*`: métricas de latência/erro/fallback
- `app/audit/*`: persistência e consulta de auditoria

## Rodar local

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 4000
```

## Compatibilidade

Endpoints migrados:
- `/api/health`
- `/api/auth/login`
- `/api/invoices`
- `/api/invoices/export.csv`
- `/api/invoices/{id}/pay`
- `/api/management/units`
- `/api/cadastros` (GET/POST/PATCH status)
- `/api/alerts` e `/api/alerts/{id}/read`
- `/api/chat/bootstrap`, `/api/chat/intents`, `/api/chat/context`, `/api/chat/message`, `/api/chat/feedback`, `/api/chat/telemetry`
- `/api/observability/metrics`, `/api/observability/alerts`, `/api/observability/alerts/dispatch`
- `/api/security/audit`

## Testes

```bash
cd backend
pytest -q
```

Cobertura inicial incluída para: health, auth, proteção 401/403, invoices, chat feedback/telemetry.
