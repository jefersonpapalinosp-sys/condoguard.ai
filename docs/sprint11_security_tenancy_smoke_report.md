# Sprint 11 Security and Tenancy Smoke Report

Status: aguardando execucao

Data de referencia: 8 de abril de 2026

## Como preencher

1. Execute `scripts/security/sprint11-security-tenancy-smoke.ps1`.
2. Anexe o arquivo gerado ou substitua este template pelo resultado da execucao.
3. Registre o ambiente alvo, os tokens mascarados e a data da rodada.

## Ambiente

- API:
- Ambiente:
- Auth provider:
- OIDC configurado:

## Resultado

| Check | Result | Evidence |
|---|---|---|
| Health responde com trace header reaproveitado | PENDING | - |
| Admin tenant 1 acessa /api/alerts | PENDING | - |
| Morador recebe FORBIDDEN em integracao ENEL | PENDING | - |
| Token invalido retorna 401 com traceId | PENDING | - |
| Tenant 2 nao acessa run ENEL do tenant 1 | PENDING | - |
| Auditoria registra sonda cross-tenant ENEL | PENDING | - |
| Tenant 2 nao acessa run SABESP do tenant 1 | PENDING | - |
| Auditoria registra sonda cross-tenant SABESP | PENDING | - |

## Observacoes

- Preencher com `PASS` ou `FAIL` apos a execucao.
- Anexar `traceId` e evidencia mascarada dos tokens/claims usados.
