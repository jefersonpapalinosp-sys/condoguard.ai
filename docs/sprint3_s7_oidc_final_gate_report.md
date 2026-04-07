# Sprint 3 + Sprint 7 OIDC Final Gate Report

Generated at: 2026-04-06 09:58:11
API: http://localhost:4000

| Check | Status | Details |
|---|---|---|
| S3-01 OIDC closure smoke | FAIL | Pre-condicao de fechamento S3-01 nao atendida no health (authProvider/oidcConfigured/authPasswordLoginEnabled). |
| S7-01 OIDC go-live smoke | FAIL | Gate S7-01 falhou: authProvider deve ser 'oidc_jwks' quando -RequireOidc. |

Summary: total=2, failed=2

Gate criteria:
- S3-01 OIDC closure smoke = PASS
- S7-01 OIDC go-live smoke = PASS
