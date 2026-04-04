# Sprint 1 - Board de Execucao (Fundacao)

Janela da sprint: 24 de marco a 4 de abril de 2026  
Status: concluida

Objetivo: entregar base funcional do CondoGuard.AI com frontend operavel, API local, fallback mock, base de dados inicial e estrategia de testes.

## Escopo concluido

1. Estrutura base frontend em React + Vite com layout principal e modulos operacionais.
2. API Node/Express local com endpoints de `invoices`, `management`, `alerts` e `chat`.
3. Fallback mock no frontend/backend para continuidade de operacao em indisponibilidade de API.
4. Scripts SQL iniciais (`001/002/003`) para schema, marts e qualidade.
5. Scripts Oracle equivalentes em `database/sql/oracle`.
6. Documentacao inicial Oracle (`docs/oracle_setup.md` e `docs/oracle_deploy_checklist.md`).
7. Suite de testes automatizados (Vitest + Playwright) estruturada e executavel.
8. Ajustes de UX responsiva mobile e navegacao principal.
9. Pagina `Cadastros Gerais` implementada e integrada no menu.
10. Widget de chatbot front integrado ao layout.

## Evidencias tecnicas

- Frontend: `src/views/*` e `src/features/*`
- API: `server/index.mjs` e repositorios em `server/repositories/*`
- SQL base: `database/sql/001_core_schema.sql`, `002_marts_views.sql`, `003_data_quality_tests.sql`
- SQL Oracle: `database/sql/oracle/001_core_schema_oracle.sql`, `002_marts_views_oracle.sql`, `003_data_quality_tests_oracle.sql`
- Testes: `tests/` + `docs/testing_strategy.md`

## Criterio de encerramento da Sprint 1

- Base funcional navegavel entregue.
- API local com fallback mock operacional.
- Scripts base de dados versionados em repositorio.
- Documentacao essencial de setup e teste disponivel.
