# Sprint 8 Closing Report

Generated at: 2026-04-06 19:38:44
Scope: eliminacao de dados sinteticos/hardcoded remanescentes
Environment baseline: local Oracle smoke em `http://localhost:4000`

## Result summary

| Item | Status | Evidence |
|---|---|---|
| S8-01 Cadastros Oracle real end-to-end | PASS | repositorio Oracle + migration `V009` + testes `test_cadastros_repo_oracle.py` |
| S8-02 Dashboard sem hardcode | PASS | KPIs dinamicos + teste `test_dashboard_repo_metrics.py` |
| S8-03 Management sem dependencia sintetica | PASS | tratamento `ORACLE_UNAVAILABLE` + teste `test_management_indicators_when_cadastros_unavailable` |
| S8-04 Settings funcional minima | PASS | endpoint `/api/settings` + pagina frontend integrada |
| S8-05 Politica de fallback por ambiente | PASS | `fallbackPolicy.ts`, `.env.example`, cobertura de servicos |
| S8-06 Regressao/smoke/evidencias | PASS | lint + suites + smoke HTTP Oracle |

## Validation commands

| Command | Result |
|---|---|
| `npm.cmd run lint` | PASS |
| `npm.cmd run test:py` | PASS (`28 passed`, `1 warning`) |
| `npm.cmd run test` | PASS (`34 passed`) |

Observacao: o warning do `pytest` foi de cache local (`PytestCacheWarning` por permissao em `.pytest_cache`) e nao afetou a execucao dos testes.

## Oracle smoke - critical endpoints

| Endpoint | HTTP |
|---|---:|
| `/api/health` | 200 |
| `/api/dashboard` | 200 |
| `/api/consumption` | 200 |
| `/api/contracts` | 200 |
| `/api/invoices` | 200 |
| `/api/management/units` | 200 |
| `/api/alerts` | 200 |
| `/api/cadastros` | 200 |
| `/api/reports` | 200 |
| `/api/settings` | 200 |
| `/api/chat/bootstrap` | 200 |

Summary: total=11, failed=0

## Closure guard

- Nenhuma pagina do escopo da sprint depende de dado sintetico quando fallback mock esta desativado.
- Dashboard nao possui KPI fixo hardcoded.
- Settings nao possui placeholder de sprint.
- Evidencias publicadas em `docs/sprint8_execution_board.md` e neste relatorio.
