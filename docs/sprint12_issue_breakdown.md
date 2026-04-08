# Sprint 12 - Quebra Tecnica e Issues

Data de referencia: 8 de abril de 2026

Objetivo deste documento:
- transformar a Sprint 12 em cards executaveis;
- conectar backlog, documentacao operacional e mudancas reais no repositorio;
- deixar claro onde a sprint produz valor tecnico imediato.

## Ordem recomendada de execucao

1. `S12-01` Consolidar migracoes em Flyway
2. `S12-03` Formalizar camada MART
3. `S12-04` Gate automatizado de data quality
4. `S12-05` Atualizar documentacao operacional da base
5. `S12-02` Revisar entidades core

## Mapa executivo das issues

| Card | Prioridade | Estimativa | Dono sugerido | Dependencias | Documento |
| --- | --- | --- | --- | --- | --- |
| `S12-01` | `P0` | `5 pts` | Dados/DBA + Backend | baseline Flyway atual | `docs/github_issues/s12-01_flyway_consolidacao.md` |
| `S12-02` | `P1` | `3 pts` | Backend/Core + Dados | `S12-01` | `docs/github_issues/s12-02_entidades_core.md` |
| `S12-03` | `P0` | `5 pts` | Backend/Core + Dados | `S12-01` | `docs/github_issues/s12-03_mart_contrato_leitura.md` |
| `S12-04` | `P0` | `3 pts` | QA/Automation + Dados | relatorio JSON versionado | `docs/github_issues/s12-04_data_quality_gate.md` |
| `S12-05` | `P0` | `3 pts` | Arquitetura + Operacao | `S12-01`, `S12-03`, `S12-04` | `docs/github_issues/s12-05_documentacao_operacional.md` |

## Escopo tecnico por card

## `S12-01` Consolidar migracoes em Flyway

Objetivo:
- tratar `database/flyway/sql` como trilha oficial de bootstrap do ambiente Oracle.

Escopo tecnico sugerido:
- `database/flyway/sql/`
- `scripts/db/flyway-migrate.ps1`
- `docs/flyway_homolog_runbook.md`

Saidas esperadas:
- inventario de versoes `V001 -> V011`;
- separacao clara entre schema core, views, seeds controlados e integracoes;
- runbook aderente ao estado atual da base.

## `S12-02` Revisar entidades core

Objetivo:
- revisar as estruturas centrais que alimentam contratos, financeiro, integracoes e auditoria.

Escopo tecnico sugerido:
- `database/flyway/sql/V001__core_schema.sql`
- `database/flyway/sql/V010__enel_integration_tables.sql`
- `backend/app/repositories/`
- `docs/data_dictionary.md`

Saidas esperadas:
- mapa claro das entidades criticas;
- gaps entre schema e consumo de API destacados;
- backlog tecnico para Sprint 13.

## `S12-03` Formalizar camada MART

Objetivo:
- explicitar as views `MART` como contrato de leitura do backend.

Escopo tecnico sugerido:
- `database/flyway/sql/V002__marts_views.sql`
- `database/flyway/sql/V006__contracts_view.sql`
- `database/flyway/sql/V008__contracts_view_finalize.sql`
- `backend/app/repositories/`
- `docs/data_dictionary.md`

Saidas esperadas:
- lista oficial de views consumidas;
- riscos de fallback e origem dos dados documentados;
- base para reduzir duplicacao de regra em repository.

## `S12-04` Gate automatizado de data quality

Objetivo:
- tornar o relatorio JSON de qualidade um gate real de sprint e de pipeline.

Escopo tecnico sugerido:
- `database/reports/data_quality_report.json`
- `scripts/db/data-quality-gate.mjs`
- `package.json`
- `tests/unit/scripts/dataQualityGate.test.ts`

Saidas esperadas:
- comando versionado de validacao;
- saida clara de PASS/FAIL;
- base pronta para CI.

## `S12-05` Atualizar documentacao operacional da base

Objetivo:
- alinhar runbook, checklist Oracle e dicionario de dados ao estado real do repositorio.

Escopo tecnico sugerido:
- `docs/flyway_homolog_runbook.md`
- `docs/oracle_deploy_checklist.md`
- `docs/data_dictionary.md`
- `docs/sprint12_execution_board.md`

Saidas esperadas:
- documentacao unica e coerente;
- menos dependencias de conhecimento tacito;
- melhor handoff para operacao e Sprint 13.

## Dependencias criticas

- `S12-01` precisa acontecer cedo para evitar documentar fluxo errado.
- `S12-03` depende do inventario real das views e repositories consumidores.
- `S12-04` depende da existencia de um relatorio JSON versionado.
- `S12-05` deve fechar apenas depois dos contratos de migracao e leitura estarem claros.

## Critico para o caminho feliz

- Se o runbook continuar refletindo apenas `V001-V003`, o bootstrap de novos ambientes fica enganoso.
- Se `MART` nao for tratado como contrato, repositories continuam misturando regra de negocio e adaptacao de fonte.
- Se o gate de qualidade nao falhar de forma objetiva, a sprint fecha sem governanca real de dados.
- Se a baseline continuar suja, o CI precisa permanecer transicional em `warn-only`.

## Artefatos gerados neste pacote

- `docs/sprint12_execution_board.md`
- `docs/sprint12_issue_breakdown.md`
- `docs/sprint12_cronograma_responsaveis.md`
- `docs/sprint12_flyway_legacy_audit.md`
- `docs/sprint12_data_quality_baseline.md`
- `docs/sprint12_core_entities_gap_analysis.md`
- `docs/sprint12_closing_checklist.md`
- `docs/github_issues/s12-01_flyway_consolidacao.md`
- `docs/github_issues/s12-02_entidades_core.md`
- `docs/github_issues/s12-03_mart_contrato_leitura.md`
- `docs/github_issues/s12-04_data_quality_gate.md`
- `docs/github_issues/s12-05_documentacao_operacional.md`
