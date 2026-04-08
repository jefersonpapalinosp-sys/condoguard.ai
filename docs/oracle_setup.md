# Oracle Setup

Trilha operacional oficial:

1. `database/flyway/sql/V001__core_schema.sql`
2. `database/flyway/sql/V002__marts_views.sql`
3. `database/flyway/sql/V003__data_quality_tests.sql`
4. demais evolucoes versionadas em `V004` ate `V010`

Scripts em `database/sql/oracle` permanecem como referencia historica/controlada, nao como fluxo operacional primario.

## Ordem de execucao recomendada

1. Criar usuarios/schemas `APP`, `MART`, `SILVER`, `BRONZE` no ambiente Oracle.
2. Configurar `ORACLE_USER`, `ORACLE_PASSWORD` e `ORACLE_CONNECT_STRING`.
3. Executar `npm run db:migrate:flyway`.
4. Validar as views `MART` e rodar `npm run db:data-quality:gate`.

## Backend pronto para Oracle

A API FastAPI em `backend/app/main.py` suporta modo por dialeto:

- `DB_DIALECT=mock`: usa seeds de `backend/data/*.json`.
- `DB_DIALECT=oracle`: usa Oracle (views `MART.*`).

Scripts npm:

- `npm run api:dev:mock`
- `npm run api:dev:oracle`
- `npm run db:migrate:flyway`

Variaveis necessarias:

- `DB_DIALECT=oracle`
- `APP_ENV=dev|hml|prod`
- `ALLOW_ORACLE_SEED_FALLBACK=true|false` (opcional)
- `ORACLE_USER`
- `ORACLE_PASSWORD`
- `ORACLE_CONNECT_STRING`
- `ORACLE_POOL_MIN`
- `ORACLE_POOL_MAX`

Observacao: o projeto opera com `.env` como arquivo de ambiente mantido no workspace.
Observacao: o validador de ambiente possui fallback interno para `.env.local` apenas se esse arquivo existir fora do fluxo padrao.
Observacao: para conectar de fato ao Oracle no FastAPI, mantenha `oracledb` instalado no ambiente Python da API.
Observacao: por padrao, fallback seed e permitido apenas em `dev/hml` e bloqueado em `prod`.

## Observacoes

- Os scripts Oracle usam `NUMBER`, `VARCHAR2`, `CLOB`, `TIMESTAMP` e `IDENTITY`.
- Diferente do Postgres, nao usamos `create table if not exists`.
- Reexecucao de DDL deve ser controlada por Flyway.
- Checklist operacional: `docs/oracle_deploy_checklist.md`.
- Runbook Flyway: `docs/flyway_homolog_runbook.md`.
