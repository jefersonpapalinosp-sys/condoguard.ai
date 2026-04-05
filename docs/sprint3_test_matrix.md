# Sprint 3 - Matriz de Testes (Auth, RBAC, Multi-condominio)

Data base: `2026-04-04`  
Ambiente alvo: `homolog`  
Objetivo: validar criterios de aceite dos cards `S3-01`, `S3-02` e `S3-03`.

## Pre-condicoes

1. API Oracle em execucao (`http://localhost:4001`).
2. `/api/health` retornando `dialect=oracle` e `dbStatus=oracle_pool_ok`.
3. Usuarios ativos em `app.usuarios` para cada role (`admin`, `sindico`, `morador`).
4. Dados de ao menos 2 condominios para testes de isolamento (`condominium_id` diferente).
5. Migration `V005__tenant2_homolog_seed.sql` aplicada para seed minimo de segundo condominio (quando necessario).

## Comandos base (PowerShell)

```powershell
# login
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:4001/api/auth/login" -ContentType "application/json" -Body '{"email":"admin@condoguard.ai","password":"password123"}'
$headers = @{ Authorization = "Bearer $($login.token)" }

# chamadas protegidas
Invoke-RestMethod -Uri "http://localhost:4001/api/invoices" -Headers $headers
Invoke-RestMethod -Uri "http://localhost:4001/api/management/units" -Headers $headers
Invoke-RestMethod -Uri "http://localhost:4001/api/alerts" -Headers $headers
Invoke-RestMethod -Uri "http://localhost:4001/api/chat/bootstrap" -Headers $headers

# usuarios de apoio para condominio 2 (apos V005)
# admin.cond2@condoguard.ai / password123
# sindico.cond2@condoguard.ai / password123
# morador.cond2@condoguard.ai / password123
```

## S3-01 - Autenticacao e identidade

| ID | Cenario | Passos | Resultado esperado |
|---|---|---|---|
| S3-01-T01 | Login valido | POST `/api/auth/login` com credenciais validas | `200`, token JWT presente |
| S3-01-T02 | Senha invalida | POST `/api/auth/login` com senha incorreta | `401`/`403`, sem token |
| S3-01-T03 | Token ausente | GET endpoint protegido sem header `Authorization` | `401 AUTH_REQUIRED` |
| S3-01-T04 | Token invalido | GET endpoint protegido com token alterado | `401` |
| S3-01-T05 | Token expirado | Requisicao com token expirado | `401` |
| S3-01-T06 | Logout por 401 (frontend) | Forcar token invalido e navegar rota protegida | sessao limpa e redireciona para login |

## S3-02 - Autorizacao por perfil (RBAC)

Endpoints principais: `/api/invoices`, `/api/management/units`, `/api/alerts`, `/api/chat/bootstrap`.

| ID | Role | Endpoint | Resultado esperado |
|---|---|---|---|
| S3-02-T01 | admin | todos os endpoints principais | `2xx` |
| S3-02-T02 | sindico | endpoints permitidos de operacao | `2xx` |
| S3-02-T03 | morador | endpoints permitidos de consulta | `2xx` |
| S3-02-T04 | morador | endpoint restrito de gestao | `403` |
| S3-02-T05 | role inexistente/no token | qualquer endpoint protegido | `403` |

Observacao: confirmar contrato final de permissoes por endpoint na policy central de RBAC.

## S3-03 - Escopo `condominium_id` (isolamento)

| ID | Cenario | Passos | Resultado esperado |
|---|---|---|---|
| S3-03-T01 | Tenant correto | token do condominio A consulta dados A | `2xx`, apenas dados A |
| S3-03-T02 | Acesso cruzado por filtro | token A tentando filtrar/consultar B | `403` ou lista vazia conforme contrato |
| S3-03-T03 | Acesso cruzado por rota | token A chamando recurso de B por id | `403` |
| S3-03-T04 | Vazamento em listagem | token A em endpoints de lista | nenhum item de B no payload |
| S3-03-T05 | Log de seguranca | tentativa cross-tenant negada | evento auditavel registrado |

## Registro de execucao (modelo)

| Data/Hora | Ambiente | Caso | Resultado | Evidencia |
|---|---|---|---|---|
| 2026-04-04 18:15 | hml | S3-01-T01 | PASS | login com token valido |
| 2026-04-04 18:16 | hml | S3-01-T03 | PASS | `AUTH_REQUIRED` sem token |

## Saida minima para fechar os cards

1. `S3-01`: T01..T06 com evidencias de request/response.
2. `S3-02`: matriz de roles por endpoint com casos positivos e negativos.
3. `S3-03`: ao menos 1 teste de acesso cruzado por endpoint critico.

## Atualizacao automatizada (04-APR-2026)

1. Suite API validou matriz RBAC de `admin/sindico/morador` para endpoints principais.
2. Suite API validou isolamento basico por tenant:
- token `condominium_id=2` retorna listas vazias no ambiente mock;
- token sem `condominium_id` retorna `401 INVALID_TENANT_SCOPE`.
3. Suite de regressao validou escopo de tenant nas queries Oracle dos repositorios:
- `invoices`, `management`, `alerts` e `chat bootstrap` com filtro/bind por `condominium_id`.
4. Suite API validou endurecimento de `S3-04`:
- rate limit especifico de login (`429`);
- validacao negativa de payload (`/api/auth/login`, `/api/chat/message`);
- validacao negativa de datas no endpoint de auditoria (`/api/security/audit`).
5. Smoke automatizado de RBAC disponivel para homolog:
- comando: `npm.cmd run db:smoke:sprint3:rbac`
- saida: `docs/sprint3_rbac_smoke_report.md`

## Atualizacao automatizada (05-APR-2026)

1. Smoke RBAC executado em Oracle homolog:
- comando: `npm.cmd run db:smoke:sprint3:rbac -- -ApiBaseUrl "http://localhost:4001"`;
- resultado: `PASS` (`failed=0`);
- evidencias: `docs/sprint3_rbac_smoke_report.md`.
2. Smoke cross-tenant executado com dois condominios reais:
- comando: `npm.cmd run db:smoke:sprint3 -- -ApiBaseUrl "http://localhost:4001" -Tenant1Email "admin@condoguard.ai" -Tenant1Password "password123" -Tenant2Email "admin.cond2@condoguard.ai" -Tenant2Password "password123"`;
- resultado: `PASS` (sem vazamento por `condominium_id`).
3. Regressao API:
- comando: `npm.cmd run test:api`;
- resultado: `20 passed`.
4. Regressao de contrato:
- comando: `npm.cmd run test:contract`;
- resultado: `4 passed`.
