# Sprint 3 RBAC Smoke Report

Generated at: 2026-04-04 22:09:29
API: http://localhost:4001
Health: dialect=oracle, dbStatus=oracle_pool_ok, authProvider=local_jwt

| Endpoint | Role | Expected | Actual | Result |
|---|---|---:|---:|---|
| /api/invoices | admin | 200 | 200 | PASS |
| /api/invoices | sindico | 200 | 200 | PASS |
| /api/invoices | morador | 403 | 403 | PASS |
| /api/management/units | admin | 200 | 200 | PASS |
| /api/management/units | sindico | 200 | 200 | PASS |
| /api/management/units | morador | 403 | 403 | PASS |
| /api/alerts | admin | 200 | 200 | PASS |
| /api/alerts | sindico | 200 | 200 | PASS |
| /api/alerts | morador | 200 | 200 | PASS |
| /api/chat/bootstrap | admin | 200 | 200 | PASS |
| /api/chat/bootstrap | sindico | 200 | 200 | PASS |
| /api/chat/bootstrap | morador | 200 | 200 | PASS |
| /api/security/audit | admin | 200 | 200 | PASS |
| /api/security/audit | sindico | 403 | 403 | PASS |
| /api/security/audit | morador | 403 | 403 | PASS |
| /api/invoices | no_token | 401 | 401 | PASS |

Summary: total=16, failed=0

Criteria: PASS only if failed=0.
