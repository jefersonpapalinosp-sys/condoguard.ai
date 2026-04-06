# Oracle Setup (Sprint 1 adianto)

Scripts Oracle disponiveis em `database/sql/oracle`:

1. `001_core_schema_oracle.sql`
2. `002_marts_views_oracle.sql`
3. `003_data_quality_tests_oracle.sql`

## Ordem de execucao recomendada

1. Criar usuarios/schemas `APP`, `MART`, `SILVER`, `BRONZE` no ambiente Oracle.
2. Executar `001_core_schema_oracle.sql` conectado como `APP`.
3. Conceder `SELECT` em `APP.*` para `MART` e executar `002_marts_views_oracle.sql` como `MART`.
4. Executar `003_data_quality_tests_oracle.sql` para validar integridade.

## Backend pronto para Oracle

A API FastAPI em `backend/app/main.py` suporta modo por dialeto:

- `DB_DIALECT=mock`: usa seeds de `server/data/*.json`.
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

Observacao: o backend carrega `.env.local` automaticamente via `pydantic-settings`.
Observacao: para conectar de fato ao Oracle no FastAPI, mantenha `oracledb` instalado no ambiente Python da API.
Observacao: por padrao, fallback seed e permitido apenas em `dev/hml` e bloqueado em `prod`.

## Observacoes

- Os scripts Oracle usam `NUMBER`, `VARCHAR2`, `CLOB`, `TIMESTAMP` e `IDENTITY`.
- Diferente do Postgres, nao usamos `create table if not exists`.
- Reexecucao de scripts DDL deve ser controlada por ferramenta de migracao (Liquibase/Flyway).
- Checklist operacional: `docs/oracle_deploy_checklist.md`.
- Runbook Flyway: `docs/flyway_homolog_runbook.md`.
