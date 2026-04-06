# Sprint 7 Rollback Drill Report

Generated at: 2026-04-06 08:38:19
Primary API: http://localhost:4000
Rollback API: http://localhost:4000

## Timeline
- Incident started at: 2026-04-06 08:38:17
- Rollback command started at: 2026-04-06 08:38:19
- Service recovered at: 2026-04-06 08:38:19
- RTO observado (incidente -> recuperacao): 2s
- Tempo de execucao de rollback (comando -> recuperacao): 0s
- RPO observado: _preencher manualmente_

## Baseline checks (primary)
| Check | ExpectedStatus | ActualStatus | ActualCode | Result |
|---|---:|---:|---|---|
| health | 200 | 200 | - | PASS |
| invoices | 200 | 200 | - | PASS |
| alerts | 200 | 200 | - | PASS |
| chat_message | 200 | 200 | - | PASS |
| observability_metrics | 200 | 200 | - | PASS |

## Recovery checks (rollback target)
| Check | ExpectedStatus | ActualStatus | ActualCode | Result |
|---|---:|---:|---|---|
| health | 200 | 200 | - | PASS |
| invoices | 200 | 200 | - | PASS |
| alerts | 200 | 200 | - | PASS |
| chat_message | 200 | 200 | - | PASS |
| observability_metrics | 200 | 200 | - | PASS |

Summary: baseline_failed=0, recovery_failed=0
