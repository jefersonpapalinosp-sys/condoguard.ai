# Sprint 3 OIDC Smoke Report

Generated at: 2026-04-04 21:46:25
API: http://localhost:4001
Health: dialect=oracle, dbStatus=oracle_pool_ok, authProvider=oidc_jwks, authPasswordLoginEnabled=False, oidcConfigured=True

| Check | ExpectedStatus | ActualStatus | ExpectedCode | ActualCode | Result |
|---|---:|---:|---|---|---|
| OIDC token valido acessa /api/alerts | 200 | 401 | - | - | FAIL |
| OIDC token valido acessa /api/chat/bootstrap | 200 | 401 | - | - | FAIL |
| Token invalido retorna 401 | 401 | 401 | INVALID_TOKEN | - | FAIL |
| Login por senha desabilitado em OIDC | 501 | 501 | AUTH_EXTERNAL_PROVIDER_REQUIRED | - | FAIL |

Summary: total=4, failed=4

Acceptance guard:
- authProvider must be `oidc_jwks`
- oidcConfigured must be `true`
- authPasswordLoginEnabled must be `false`
- all checks must PASS
