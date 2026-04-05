# Sprint 3 - Runbook de Validacao Cross-Tenant (Oracle)

Data de referencia: 4 de abril de 2026

## Objetivo

Executar validacao real de isolamento por `condominium_id` em Oracle para fechamento de `S3-03`.

## Pre-requisitos

1. API em Oracle (`DB_DIALECT=oracle`) com health OK.
2. Migration Flyway `V005__tenant2_homolog_seed.sql` aplicada.
3. Usuarios disponiveis:
   - `admin@condoguard.ai` / `password123` (condominio 1)
   - `admin.cond2@condoguard.ai` / `password123` (condominio 2)
4. Login por senha habilitado para o teste local de smoke:
   - `AUTH_PASSWORD_LOGIN_ENABLED=true` (se estiver testando cross-tenant com credenciais locais).

## 1) Confirmar health

```powershell
curl.exe http://localhost:4001/api/health
```

Esperado:
- `dialect=oracle`
- `dbStatus=oracle_pool_ok`

## 2) Login condominio 1 e chamadas principais

```powershell
$loginC1 = Invoke-RestMethod -Method Post -Uri "http://localhost:4001/api/auth/login" -ContentType "application/json" -Body '{"email":"admin@condoguard.ai","password":"password123"}'
$headersC1 = @{ Authorization = "Bearer $($loginC1.token)" }

$invC1 = Invoke-RestMethod -Uri "http://localhost:4001/api/invoices" -Headers $headersC1
$mgmtC1 = Invoke-RestMethod -Uri "http://localhost:4001/api/management/units" -Headers $headersC1
$alertsC1 = Invoke-RestMethod -Uri "http://localhost:4001/api/alerts" -Headers $headersC1
```

## 3) Login condominio 2 e chamadas principais

```powershell
$loginC2 = Invoke-RestMethod -Method Post -Uri "http://localhost:4001/api/auth/login" -ContentType "application/json" -Body '{"email":"admin.cond2@condoguard.ai","password":"password123"}'
$headersC2 = @{ Authorization = "Bearer $($loginC2.token)" }

$invC2 = Invoke-RestMethod -Uri "http://localhost:4001/api/invoices" -Headers $headersC2
$mgmtC2 = Invoke-RestMethod -Uri "http://localhost:4001/api/management/units" -Headers $headersC2
$alertsC2 = Invoke-RestMethod -Uri "http://localhost:4001/api/alerts" -Headers $headersC2
```

## 4) Evidencia minima esperada

1. Dados de `C1` e `C2` diferem em pelo menos `invoices` e `management`.
2. Nenhuma resposta de `C2` contem identificadores de unidades/blocos exclusivos de `C1`.
3. Nenhuma resposta de `C1` contem identificadores exclusivos de `C2`.

## 5) Registro de evidencia

Registrar no `docs/sprint3_test_matrix.md`:
- data/hora
- ambiente
- casos `S3-03-T01..T05`
- resultado (PASS/FAIL)
- links/prints de evidencias

## Execucao automatizada (recomendada)

Com backend Oracle no ar:

```powershell
npm.cmd run db:smoke:sprint3
```

Com credenciais customizadas:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/db/sprint3-cross-tenant-smoke.ps1 `
  -ApiBaseUrl "http://localhost:4001" `
  -Tenant1Email "admin@condoguard.ai" `
  -Tenant1Password "password123" `
  -Tenant2Email "admin.cond2@condoguard.ai" `
  -Tenant2Password "password123"
```
