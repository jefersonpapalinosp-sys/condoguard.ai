# Sprint 7 HML Go-live Smoke Report

Generated at: 2026-04-06 08:38:13
API: http://localhost:4000
Gate mode: local_or_oidc
Health: env=hml, dialect=oracle, dbStatus=oracle_pool_ok, authProvider=local_jwt, authPasswordLoginEnabled=True, oidcConfigured=False

| Check | ExpectedStatus | ActualStatus | ExpectedCode | ActualCode | Result |
|---|---:|---:|---|---|---|
| Login admin para smoke local | 200 | 200 | - | - | PASS |
| Financeiro (/api/invoices) | 200 | 200 | - | - | PASS |
| Gestao (/api/management/units) | 200 | 200 | - | - | PASS |
| Alertas (/api/alerts) | 200 | 200 | - | - | PASS |
| Chat (/api/chat/message) | 200 | 200 | - | - | PASS |
| Observabilidade (/api/observability/metrics) | 200 | 200 | - | - | PASS |

Summary: total=6, failed=0

Go-live guard (S7-01):
- health em Oracle (dialect=oracle, dbStatus=oracle_pool_ok)
- endpoints criticos financeiros/alertas/chat/observabilidade respondendo 200
