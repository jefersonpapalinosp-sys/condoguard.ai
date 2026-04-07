# Sprint 8 - Execution Board (Eliminacao de dados sinteticos)

Data de referencia: 6 de abril de 2026

Objetivo da sprint: remover os ultimos pontos de dados sinteticos/hardcoded da aplicacao, garantindo comportamento consistente com Oracle real em `hml/prod`.

## Escopo fechado desta sprint

- `Cadastros Gerais` sem dependencia obrigatoria de seed/in-memory.
- `Dashboard` sem KPIs hardcoded (`monthlySavings`, `currentConsumption`).
- `Management` com indicador de pendencias sem dependencia de sintetico oculto.
- `Settings` consumindo endpoint real.
- Politica de fallback mock no frontend governada por ambiente/flag.

## Fora de escopo

- Mudancas estruturais de OIDC/RBAC ja tratadas nas sprints anteriores.
- Novos modulos de produto nao relacionados a eliminacao de sintetico.

## Status resumido

- `S8-01` Cadastros Oracle real end-to-end: **done**
- `S8-02` Dashboard sem hardcode: **done**
- `S8-03` Management sem dependencia sintetica: **done**
- `S8-04` Settings funcional minima: **done**
- `S8-05` Politica de fallback por ambiente (frontend): **done**
- `S8-06` Regressao, smoke e evidencias finais: **done**

## S8-01 - Cadastros Oracle real end-to-end

- [x] Implementado repositorio de cadastros em Oracle (`list/create/update status`) com filtro por `condominium_id`.
- [x] Fallback mantido apenas quando `ALLOW_ORACLE_SEED_FALLBACK=true`.
- [x] Com `ALLOW_ORACLE_SEED_FALLBACK=false`, retorno explicito `ORACLE_UNAVAILABLE` (sem seed invisivel).
- [x] Paridade de payload mantida com frontend (`items`, `meta`, `filters` via rota paginada).
- [x] Cobertura de repositorio para fluxo feliz e fluxo de erro sem fallback.

DoD:
- Endpoints `/api/cadastros` (GET/POST/PATCH) respondendo em Oracle: PASS no smoke.
- Sem dados sinteticos quando fallback estiver desativado: PASS.
- Testes automatizados passando: PASS.

## S8-02 - Dashboard sem hardcode

- [x] Removidos valores fixos em `backend/app/repositories/dashboard_repo.py`.
- [x] `monthlySavings` calculado dinamicamente a partir de dados reais agregados.
- [x] `currentConsumption` calculado dinamicamente por regra baseada em anomalias/KPI.
- [x] `recentAlerts` e `pendingContracts` preservados com consistencia de API real.
- [x] Adicionado teste automatizado para regressao dos KPIs.

DoD:
- Nenhum KPI fixo no backend do dashboard: PASS.
- Regras de calculo cobertas por teste e comentario tecnico: PASS.

## S8-03 - Management sem dependencia sintetica

- [x] Calculo de `pendingCount` usa `maintenanceCount + cadastrosPending` a partir da resposta de `cadastros`.
- [x] Em indisponibilidade Oracle de cadastros (`ORACLE_UNAVAILABLE`), endpoint de management permanece disponivel com `cadastrosPending=0`.
- [x] Indicadores `occupancy`, `delinquency` e `pending` mantidos consistentes.
- [x] Cobertura de regressao adicionada para `/api/management/units` com indisponibilidade de cadastros.

DoD:
- Indicadores de `management` derivados de fonte real ou indisponibilidade explicita: PASS.

## S8-04 - Settings funcional minima

- [x] Placeholder da tela `Settings` substituido por leitura real (read-only).
- [x] Endpoint backend `/api/settings` (GET) criado com dados operacionais.
- [x] Estado de erro/loading alinhado com os demais modulos.
- [x] `DataSourceBadge` incluido no modulo.

DoD:
- Tela `Settings` sem placeholder de sprint: PASS.
- Dados carregados via API real: PASS.

## S8-05 - Politica de fallback por ambiente (frontend)

- [x] Implementada flag explicita `VITE_ENABLE_MOCK_FALLBACK`.
- [x] Em `hml/prod`, fallback mock desativado por padrao (`VITE_APP_ENV` + politica central).
- [x] Com fallback desativado e falha de API, erro real e fonte `unknown` (sem `mockApi`).
- [x] Badge/fonte de dados ajustados para evitar mock invisivel.
- [x] Testes de servico atualizados para os dois modos (ligado/desligado).

DoD:
- Com fallback desativado, modulos nao retornam `mockApi`: PASS.
- Fluxo de erro visivel e rastreavel: PASS.

## S8-06 - Regressao, smoke e evidencias finais

- [x] Rodado `npm.cmd run lint` -> PASS.
- [x] Rodado `npm.cmd run test:py` -> `28 passed`.
- [x] Rodado `npm.cmd run test` -> `34 passed`.
- [x] Rodado smoke de endpoints criticos com Oracle em `localhost:4000` -> todos `200`.
- [x] Publicado relatorio final da sprint com evidencias.

DoD:
- Suites verdes: PASS.
- Evidencias versionadas em `docs/`: PASS.
- Sem pendencia P0 aberta no objetivo da sprint: PASS.

## Evidencias registradas (06-APR-2026)

- `docs/sprint8_closing_report.md`
- `npm.cmd run lint` -> PASS
- `npm.cmd run test:py` -> `28 passed, 1 warning`
- `npm.cmd run test` -> `34 passed`
- Smoke Oracle `localhost:4000`:
  - `/api/health` 200
  - `/api/dashboard` 200
  - `/api/consumption` 200
  - `/api/contracts` 200
  - `/api/invoices` 200
  - `/api/management/units` 200
  - `/api/alerts` 200
  - `/api/cadastros` 200
  - `/api/reports` 200
  - `/api/settings` 200
  - `/api/chat/bootstrap` 200
