# Sprint 11 - Runbook de Smoke de Seguranca e Tenancy

Data de referencia: 8 de abril de 2026

Objetivo: validar o gate tecnico da Sprint 11 cobrindo autenticacao, RBAC, isolamento multi-condominio e correlacao por `trace_id`.

## O que este smoke valida

- token administrativo consegue acessar uma rota protegida;
- perfil `morador` segue bloqueado para integracoes administrativas;
- token invalido retorna `401` com `traceId` correlacionavel;
- um tenant nao acessa `runId` de integracao pertencente a outro tenant;
- a tentativa cross-tenant gera evento auditavel `integration_cross_tenant_run_access_denied`;
- o header `X-Trace-Id` e respeitado pela API.

## Pre-condicoes

- API backend disponivel e respondendo em `/api/health`.
- Tenant 1 com token `admin`.
- Tenant 2 com token `admin`.
- Um token valido de `morador`.
- Integracoes ENEL e SABESP habilitadas no ambiente.
- Auditoria de seguranca habilitada no backend.

## Parametros esperados

- `AdminTokenTenant1`: token administrativo do condominio base.
- `AdminTokenTenant2`: token administrativo de outro condominio.
- `MoradorToken`: token de morador para validar RBAC.
- `ApiBaseUrl`: URL da API alvo.
- `OutputPath`: caminho do relatorio markdown.

## Execucao

```powershell
powershell -ExecutionPolicy Bypass -File scripts/security/sprint11-security-tenancy-smoke.ps1 `
  -ApiBaseUrl "http://localhost:4000" `
  -AdminTokenTenant1 "<TOKEN_ADMIN_TENANT_1>" `
  -AdminTokenTenant2 "<TOKEN_ADMIN_TENANT_2>" `
  -MoradorToken "<TOKEN_MORADOR>" `
  -OutputPath "docs/sprint11_security_tenancy_smoke_report.md"
```

## Resultado esperado

- relatorio markdown gerado em `docs/sprint11_security_tenancy_smoke_report.md`;
- todos os checks com `PASS`;
- `traceId` presente em falhas autenticadas;
- `404 NOT_FOUND` preservado para consulta cross-tenant;
- evento auditavel consultavel no tenant do usuario que tentou o acesso indevido.

## Evidencias minimas para anexar

- resposta de `/api/health`;
- trecho do relatorio markdown com `Summary`;
- evidencias mascaradas dos claims usados;
- exemplo de `traceId` correlacionado entre resposta e log;
- consulta do endpoint `/api/security/audit` para o evento `integration_cross_tenant_run_access_denied`.

## Observacoes

- Este runbook fecha apenas o smoke da Sprint 11. A validacao real de `OIDC/JWKS` continua dependente das configuracoes corporativas de homolog.
- Se o ambiente estiver em `local_jwt`, o smoke ainda ajuda a validar tenancy, RBAC e `trace_id`, mas nao substitui o gate de identidade real.
