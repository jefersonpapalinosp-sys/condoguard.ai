# Sprint 4 - Checklist de Fechamento

Data de referencia: 5 de abril de 2026
Objetivo: consolidar evidencias de fechamento dos cards `S4-01` a `S4-04`.

## Status geral

- `S4-01` Financeiro: **Done**
- `S4-02` Gestao de unidades: **Done**
- `S4-03` Alertas ciclo completo: **Done**
- `S4-04` Padrao de listagens: **Done**
- Sprint 4: **Fechada tecnicamente (local)**.

## Evidencias por card

## `S4-01` Financeiro com filtros/paginacao/exportacao CSV

Status: **Done tecnico**

Evidencias:
- Endpoint `GET /api/invoices` com filtros/paginacao/sort padronizados.
- Endpoint `GET /api/invoices/export.csv` funcional.
- Endpoint `PATCH /api/invoices/:id/pay` funcional com persistencia de status pago.
- Tela de Faturas com busca, ordenacao, paginacao e botao `Exportar CSV`.
- Tela de Faturas com `Registrar pagamento` integrado a API e recarga da listagem.
- Teste de API cobrindo export CSV:
  - `tests/api/endpoints.api.test.ts` (`exports invoices CSV with active filters`).
- Teste de API cobrindo pagamento:
  - `tests/api/endpoints.api.test.ts` (`marks invoice as paid and returns updated item`).

Validacao (Windows):
```powershell
cd C:\Users\Camila\Desktop\Senac\workspace\CondoGuard.AI\condoguard.ai
npm.cmd run test:api
```

Smoke manual:
```powershell
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/auth/login" -ContentType "application/json" -Body '{"email":"admin@condoguard.ai","password":"password123"}'
$headers = @{ Authorization = "Bearer $($login.token)" }
Invoke-WebRequest -Method Get -Uri "http://localhost:4000/api/invoices/export.csv?status=pending&sortBy=amount&sortOrder=desc" -Headers $headers -OutFile ".\invoices-export.csv"
Get-Content .\invoices-export.csv -TotalCount 5
```

## `S4-02` Gestao de unidades com indicadores operacionais

Status: **Done tecnico**

Evidencias:
- Endpoint `GET /api/management/units` retorna:
  - `items`, `meta`, `filters`, `sort`
  - `indicators.occupancy`, `indicators.delinquency`, `indicators.pending`
- Tela de Gestao exibindo KPIs reais (ocupacao, inadimplencia, pendencias).
- Teste de API validando indicadores.

Smoke manual (Windows):
```powershell
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/auth/login" -ContentType "application/json" -Body '{"email":"admin@condoguard.ai","password":"password123"}'
$headers = @{ Authorization = "Bearer $($login.token)" }
Invoke-RestMethod -Method Get -Uri "http://localhost:4000/api/management/units?page=1&pageSize=5&status=occupied" -Headers $headers | ConvertTo-Json -Depth 10
```

## `S4-03` Alertas com severidade, historico e leitura

Status: **Done tecnico**

Evidencias:
- Endpoint `GET /api/alerts` com filtros por `severity`, `status`, `search`, paginacao e ordenacao.
- Endpoint `PATCH /api/alerts/:id/read` funcional e auditado.
- Persistencia de leitura por tenant em `backend/data/alerts_reads_state.json`.
- Tela de Alertas com:
  - filtro por severidade e estado (`Abertos`, `Lidos`)
  - acao `Marcar como lido` persistente.
- Testes:
  - API cobrindo `mark as read`
  - integracao de UI cobrindo fluxo de leitura
  - E2E dedicado (`tests/e2e/alerts.e2e.spec.ts`).

Smoke manual (Windows):
```powershell
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/auth/login" -ContentType "application/json" -Body '{"email":"admin@condoguard.ai","password":"password123"}'
$headers = @{ Authorization = "Bearer $($login.token)" }
$before = Invoke-RestMethod -Method Get -Uri "http://localhost:4000/api/alerts?page=1&pageSize=1&status=active" -Headers $headers
$alertId = $before.items[0].id
Invoke-RestMethod -Method Patch -Uri "http://localhost:4000/api/alerts/$alertId/read" -Headers $headers -ContentType "application/json" -Body "{}" | ConvertTo-Json -Depth 6
Invoke-RestMethod -Method Get -Uri "http://localhost:4000/api/alerts?page=1&pageSize=5&status=read" -Headers $headers | ConvertTo-Json -Depth 8
```

## `S4-04` Padrao unico de API para listagens

Status: **Done tecnico**

Padrao consolidado:
- Query: `page`, `pageSize`, `search`, `sortBy`, `sortOrder` + filtros de dominio.
- Resposta: `items`, `meta`, `filters`, `sort`.
- Compatibilidade temporaria preservada onde necessario (`units` em management).

Evidencias:
- `backend/app/api/routes.py` padronizado para invoices, management e alerts.
- Services frontend alinhados ao contrato padrao.
- Suites de API/contract validadas.

## Validacao final recomendada (Sprint 4)

1. `npm.cmd run lint`
2. `npm.cmd run test:api`
3. `npm.cmd run test:contract`
4. `npm.cmd run test:integration`
5. `npm.cmd run test:e2e`

Resultado consolidado (executado em 5-APR-2026):
- `lint`: PASS
- `test` (Vitest completo): **65 passed**
- `test:e2e` (Playwright): **7 passed**

## Pendencias para fechamento formal

1. Rodar regressao final em homolog com backend Oracle ativo e gate de identidade real (`S3-01`) concluido.

Observacao de decisao:
- A validacao final em homolog foi deliberadamente adiada para etapa posterior, sem bloquear o fechamento tecnico da Sprint 4.

