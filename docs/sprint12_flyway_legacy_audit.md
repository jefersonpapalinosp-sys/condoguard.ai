# Sprint 12 - Auditoria de Dependencias Flyway vs. SQL Legado

Data de referencia: 8 de abril de 2026

## Objetivo

Confirmar se ainda existe dependencia operacional relevante em `database/sql` ou `database/sql/oracle` fora da trilha oficial `database/flyway/sql`.

## Resultado executivo

- trilha operacional oficial: `database/flyway/sql`
- runtime/backend: nao depende de `database/sql` nem de `database/sql/oracle`
- workflows ativos: usam Flyway
- scripts auxiliares recentes: usam arquivos Flyway
- referencias legadas restantes: majoritariamente documentacao historica

## Dependencias operacionais validadas

- `.github/workflows/flyway-homolog.yml`
  - usa `database/flyway/sql`
- `scripts/db/flyway-migrate.ps1`
  - usa `database/flyway/sql`
- `scripts/db/apply_contracts_migrations.py`
  - referencia `V006`, `V007`, `V008`
- `scripts/db/apply_cadastros_migration.py`
  - referencia `V009`

## O que ainda aponta para o modelo legado

### Documentacao principal que foi atualizada nesta sprint

- `README.md`
- `docs/oracle_setup.md`
- `docs/data_roadmap.md`

### Documentacao historica preservada como contexto

- `docs/sprint1_execution_board.md`
- `docs/sprint2_execution_board.md`
- `docs/github_issues/s2-02_migracoes_flyway.md`

Observacao:
- os documentos historicos podem continuar mencionando `database/sql` porque registram a transicao feita nas sprints iniciais;
- eles nao devem ser tratados como fonte operacional atual.

## Conclusao

Nao foi encontrada dependencia operacional viva que obrigue o uso de `database/sql/oracle` para bootstrap atual do ambiente.

O risco residual esta em divergencia documental, nao em runtime.

## Proxima acao recomendada

- manter `docs/flyway_homolog_runbook.md` como fonte operacional unica;
- tratar `database/sql` e `database/sql/oracle` como referencia historica/controlada ate decisao explicita de arquivamento.
