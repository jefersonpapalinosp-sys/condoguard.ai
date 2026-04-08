# Flyway Homolog Runbook

## Objetivo

Executar migracoes Oracle em homolog usando `database/flyway/sql` como trilha oficial de versionamento da base.

## Trilha oficial de migracoes

1. `V001__core_schema.sql`
   - schema transacional principal (`APP`) com entidades core.
2. `V002__marts_views.sql`
   - views `MART` iniciais usadas pelo backend.
3. `V003__data_quality_tests.sql`
   - queries de validacao de integridade e dominio.
4. `V004__auth_users.sql`
   - usuarios locais de suporte para `dev/hml`.
5. `V005__tenant2_homolog_seed.sql`
   - massa controlada para smoke cross-tenant em homolog.
6. `V006__contracts_view.sql`
   - fallback inicial para `mart.vw_contracts`.
7. `V007__contracts_schema_bootstrap.sql`
   - bootstrap seguro de contratos e fornecedores.
8. `V008__contracts_view_finalize.sql`
   - view final de contratos com fallback controlado.
9. `V009__cadastros_gerais_store.sql`
   - store persistente do modulo Cadastros Gerais.
10. `V010__enel_integration_tables.sql`
    - trilha de execucao da integracao ENEL e evolucao de origem das faturas.

## Estrutura

- Migracoes: `database/flyway/sql`
- Script local: `scripts/db/flyway-migrate.ps1`
- Pipeline CI: `.github/workflows/flyway-homolog.yml`
- Gate de qualidade: `npm run db:data-quality:gate`

## Pre-requisitos

- Docker instalado no runner/local.
- Variaveis de ambiente definidas:
  - `ORACLE_USER`
  - `ORACLE_PASSWORD`
  - `ORACLE_CONNECT_STRING`

## Execucao local

```powershell
$env:ORACLE_USER="APP"
$env:ORACLE_PASSWORD="***"
$env:ORACLE_CONNECT_STRING="host:1521/SERVICE"
npm run db:migrate:flyway
```

Depois da migration, rodar o gate de qualidade:

```bash
npm run db:data-quality:gate
```

Se a intencao for apenas diagnosticar a baseline atual sem bloquear a execucao:

```bash
npm run db:data-quality:gate:warn
```

## Execucao no GitHub Actions

Configurar `Repository secrets`:

- `ORACLE_USER`
- `ORACLE_PASSWORD`
- `ORACLE_CONNECT_STRING`

Depois disparar o workflow `Flyway Homolog`.

## Checklist de validacao apos migracao

- Confirmar `flyway_schema_history` com `V001 -> V011` em ordem.
- Validar existencia das views:
  - `mart.vw_management_units`
  - `mart.vw_financial_invoices`
  - `mart.vw_alerts_operational`
  - `mart.vw_contracts`
- Executar `npm run db:data-quality:gate`.
- Registrar qualquer seed controlado usado para smoke (`V004`, `V005`).

## Evidencias esperadas

- Log de migration com versoes em ordem.
- Sem erro de checksum.
- Historico Flyway atualizado no banco homolog.
- Resultado do gate de data quality anexado ao fechamento da sprint/ambiente.
