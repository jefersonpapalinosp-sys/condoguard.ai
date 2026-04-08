# S12-05 - Atualizar documentacao operacional da base

## Contexto

Objetivo da Sprint 12: alinhar a documentacao operacional da camada de dados ao estado real do repositorio e ao fluxo atual de homolog/prod.

Card: `S12-05`  
Prioridade: `P0`  
Estimativa: `3 pts`

## Criterio de aceite

- runbook Flyway, checklist Oracle e dicionario de dados apontam para o mesmo contrato;
- time operacional entende o fluxo de migracao e o gate de qualidade;
- a Sprint 13 herda documentacao coerente.

## Escopo tecnico

- atualizar os documentos principais da base;
- refletir a trilha Flyway real e o contrato `MART`;
- incluir o gate de qualidade no fluxo operacional.

## Arquivos provaveis

- `docs/flyway_homolog_runbook.md`
- `docs/oracle_deploy_checklist.md`
- `docs/data_dictionary.md`
- `docs/sprint12_execution_board.md`

## Checklist de implementacao

- [x] Atualizar runbook com `V001 -> V011`.
- [x] Atualizar dicionario de dados com entidades `APP` e views `MART`.
- [x] Atualizar checklist Oracle para privilegiar Flyway e data quality gate.
- [x] Publicar baseline da qualidade e auditoria de legado.
- [x] Consolidar checklist final da sprint.

## Evidencias obrigatorias

- [x] links dos documentos atualizados;
- [x] referencia ao comando oficial do gate;
- [x] pendencias estruturais registradas para Sprint 13.

## Dependencias

- `S12-01`, `S12-03` e `S12-04`.

## Definicao de pronto (DoD do card)

- criterio de aceite atendido;
- documentacao operacional sem divergencia relevante;
- handoff de dados mais previsivel.
