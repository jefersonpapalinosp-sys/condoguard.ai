# S12-02 - Revisar entidades core

## Contexto

Objetivo da Sprint 12: tornar explicitos os contratos centrais de dados que sustentam backend, integracoes e governanca.

Card: `S12-02`  
Prioridade: `P1`  
Estimativa: `3 pts`

## Criterio de aceite

- entidades core criticas possuem finalidade e relacao documentadas;
- gaps entre schema e consumo real da API ficam mapeados;
- backlog tecnico para Sprint 13 fica claro.

## Escopo tecnico

- revisar entidades de contratos, faturas, integracoes e auditoria;
- conectar schema Oracle com repositories e payloads usados na API;
- registrar riscos e proximos ajustes.

## Arquivos provaveis

- `database/flyway/sql/V001__core_schema.sql`
- `database/flyway/sql/V010__enel_integration_tables.sql`
- `database/flyway/sql/V011__sabesp_consumption_tables.sql`
- `backend/app/repositories/`
- `docs/data_dictionary.md`

## Checklist de implementacao

- [x] Mapear entidades core atuais.
- [x] Revisar relacoes e constraints prioritarias.
- [x] Registrar gaps entre modelo e consumo real.
- [x] Preparar backlog tecnico para Sprint 13.

## Evidencias obrigatorias

- [x] documentacao atualizada com entidades core;
- [x] lista de gaps/riscos estruturais;
- [x] recomendacao objetiva para proximas migracoes.

## Dependencias

- `S12-01` e `S12-03`.

## Definicao de pronto (DoD do card)

- criterio de aceite atendido;
- entidades criticas entendidas por backend e dados;
- gaps prontos para priorizacao.
