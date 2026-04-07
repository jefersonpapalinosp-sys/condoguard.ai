# Sprint 3 OIDC Smoke Report

Generated at: 2026-04-06 09:58:11
API: http://localhost:4000
Health: dialect=oracle, dbStatus=oracle_pool_ok, authProvider=local_jwt, authPasswordLoginEnabled=True, oidcConfigured=False

| Check | ExpectedStatus | ActualStatus | ExpectedCode | ActualCode | Result |
|---|---:|---:|---|---|---|
| OIDC token valido acessa /api/alerts | 200 | 401 | - | - | FAIL |
| OIDC token valido acessa /api/chat/bootstrap | 200 | 401 | - | - | FAIL |
| Token invalido retorna 401 | 401 | 401 | INVALID_TOKEN | INVALID_TOKEN | PASS |
| Login por senha desabilitado em OIDC | 501 | 200 | AUTH_EXTERNAL_PROVIDER_REQUIRED | - | FAIL |

Summary: total=4, failed=3

Acceptance guard:
- authProvider must be `oidc_jwks`
- oidcConfigured must be `true`
- authPasswordLoginEnabled must be `false`
- all checks must PASS
