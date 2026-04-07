# Flyway Homolog Runbook (Sprint 2)

## Objetivo

Executar migracoes Oracle em homolog com versionamento Flyway na ordem:

1. `V001__core_schema.sql`
2. `V002__marts_views.sql`
3. `V003__data_quality_tests.sql`

## Estrutura

- Migracoes: `database/flyway/sql`
- Script local: `scripts/db/flyway-migrate.ps1`
- Pipeline CI: `.github/workflows/flyway-homolog.yml`

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

## Execucao no GitHub Actions

Configurar `Repository secrets`:

- `ORACLE_USER`
- `ORACLE_PASSWORD`
- `ORACLE_CONNECT_STRING`

Depois disparar o workflow `Flyway Homolog`.

## Evidencias esperadas

- Log de migration com versoes em ordem.
- Sem erro de checksum.
- Historico Flyway atualizado no banco homolog.
