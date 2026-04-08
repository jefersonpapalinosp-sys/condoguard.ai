# S12-01 - Consolidar migracoes em Flyway

## Contexto

Objetivo da Sprint 12: tornar Flyway a trilha oficial de bootstrap e evolucao da base Oracle.

Card: `S12-01`  
Prioridade: `P0`  
Estimativa: `5 pts`

## Criterio de aceite

- ambiente novo pode ser descrito por `V001 -> V011`;
- runbook de homolog reflete as versoes reais do repositorio;
- seeds controlados e views de fallback ficam claramente identificados.

## Escopo tecnico

- revisar `database/flyway/sql` e classificar cada migracao;
- alinhar `scripts/db/flyway-migrate.ps1` e o fluxo operacional;
- atualizar a documentacao para usar Flyway como fonte de verdade.

## Arquivos provaveis

- `database/flyway/sql/`
- `scripts/db/flyway-migrate.ps1`
- `docs/flyway_homolog_runbook.md`

## Checklist de implementacao

- [x] Inventariar versoes `V001` a `V011`.
- [x] Atualizar runbook com a sequencia real de migracoes.
- [x] Confirmar se ainda existe dependencia operacional em `database/sql/oracle`.
- [x] Registrar quais migracoes sao seeds controlados.
- [x] Publicar a migracao `V011__sabesp_consumption_tables.sql` para fechar o gap estrutural da SABESP.
- [ ] Publicar evidencias de execucao ou checklist de bootstrap.

## Evidencias obrigatorias

- [x] runbook atualizado;
- [x] auditoria de legado registrada;
- [x] lista de versoes com finalidade descrita;
- [ ] comando oficial de migracao referenciado na doc.

## Dependencias

- baseline Flyway atual no repositorio.

## Definicao de pronto (DoD do card)

- criterio de aceite atendido;
- documentacao operacional alinhada;
- base pronta para apoiar `S12-03` e `S12-05`.
