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

A API em `server/index.mjs` ja suporta modo por dialeto:

- `DB_DIALECT=mock`: usa seeds de `server/data/*.json`.
- `DB_DIALECT=oracle`: tenta Oracle (views `MART.*`) e faz fallback para seed em erro.

Scripts npm:

- `npm run api:dev:mock`
- `npm run api:dev:oracle`

Variaveis necessarias:

- `DB_DIALECT=oracle`
- `ORACLE_USER`
- `ORACLE_PASSWORD`
- `ORACLE_CONNECT_STRING`
- `ORACLE_POOL_MIN`
- `ORACLE_POOL_MAX`

Observacao: o backend carrega `.env.local` automaticamente via `server/start.mjs`.
Observacao: para conectar de fato ao Oracle no Node, mantenha `oracledb` instalado no ambiente da API.

## Observacoes

- Os scripts Oracle usam `NUMBER`, `VARCHAR2`, `CLOB`, `TIMESTAMP` e `IDENTITY`.
- Diferente do Postgres, nao usamos `create table if not exists`.
- Reexecucao de scripts DDL deve ser controlada por ferramenta de migracao (Liquibase/Flyway).
- Checklist operacional: `docs/oracle_deploy_checklist.md`.
