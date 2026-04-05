# Sprint 2 - Oracle Smoke Report

Data: `2026-04-04`  
Ambiente: `homolog`  
Dialeto: `oracle`

## Health

- Endpoint: `/api/health`
- Evidencia esperada:
  - `dialect=oracle`
  - `dbStatus=oracle_pool_ok`
  - `poolStatus=active`
  - `latencyMs` preenchido

## Endpoints smoke

| Endpoint | Status esperado | Latencia alvo (ms) | Resultado |
|---|---:|---:|---|
| `/api/invoices` | 200 | <= 1200 | pendente |
| `/api/management/units` | 200 | <= 1200 | pendente |
| `/api/alerts` | 200 | <= 1200 | pendente |
| `/api/chat/bootstrap` | 200 | <= 1200 | pendente |

## Observacoes

- Preencher resultados apos execucao em homolog Oracle real.
- Em caso de falha, anexar payload de erro e timestamp.
