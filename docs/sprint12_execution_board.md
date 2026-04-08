# Sprint 12 - Execution Board (Dados, Flyway, MART e qualidade)

Data de referencia: 8 de abril de 2026

Objetivo da sprint: oficializar a camada de dados como contrato do produto, reduzindo dependencia de scripts soltos e transformando Flyway, MART e data quality em trilha operacional do sistema.

## Escopo da sprint

- Consolidacao das migracoes versionadas em `database/flyway/sql`.
- Inventario das entidades core e do contrato de leitura via `MART`.
- Gate automatizado de qualidade de dados baseado em relatorio JSON versionado.
- Atualizacao do runbook de Flyway, checklist Oracle e dicionario de dados.
- Preparacao do terreno para Sprint 13 com backend mais desacoplado da estrutura transacional.

## Fora de escopo

- Reprocessamento integral da base historica em Oracle.
- Refactor amplo de repositories do backend sem relacao com contrato de dados.
- Novas features de negocio no frontend.
- Go-live produtivo da camada Oracle.

## Status resumido

- `S12-01` Consolidar migracoes em Flyway: **em andamento com `V011` publicada**
- `S12-02` Revisar entidades core para contratos, faturas, integracoes e auditoria: **done tecnico local**
- `S12-03` Formalizar camada MART para modulos criticos: **em andamento**
- `S12-04` Gate automatizado de data quality: **done tecnico inicial**
- `S12-05` Atualizar documentacao operacional da base: **em andamento**

## S12-01 - Consolidar migracoes em Flyway

- [x] Inventariar migracoes atuais `V001` a `V011`.
- [x] Atualizar runbook de homolog para refletir a trilha real de versoes.
- [x] Explicitar quais migracoes sao `core`, `seed controlado`, `views` e `integracoes`.
- [x] Validar se ainda existe dependencia operacional de `database/sql/oracle/*` fora do fluxo versionado.
- [x] Revisar necessidade de novas migracoes para SABESP/auditoria em Sprint 12.
- [x] Publicar `V011__sabesp_consumption_tables.sql` para fechar o gap estrutural da SABESP.
- [ ] Publicar checklist de bootstrap de ambiente novo usando apenas Flyway.

DoD:
- Um ambiente novo consegue ser descrito pela trilha `V001 -> V011`.
- Time operacional sabe quais migracoes sao obrigatorias e quais sao seeds controlados.
- Runbook oficial deixa de depender da documentacao antiga de Sprint 2.

## S12-02 - Revisar entidades core

- [x] Mapear entidades core ja presentes em `APP` e dependencias do backend.
- [x] Revisar contratos de `contratos`, `faturas_condominiais`, `integracoes_execucoes`, `integracoes_itens` e trilha de auditoria.
- [x] Identificar gaps entre modelo Oracle e payloads usados pela API.
- [x] Registrar ajustes prioritarios para Sprint 13.

DoD:
- Entidades core criticas possuem dono, finalidade e relacao documentada.
- Gaps estruturais ficam visiveis antes de novas integracoes.

## S12-03 - Formalizar camada MART

- [x] Confirmar quais views `MART` sao consumidas hoje pelo backend.
- [x] Documentar `vw_management_units`, `vw_financial_invoices`, `vw_alerts_operational` e `vw_contracts` como contrato atual.
- [ ] Revisar fallback de `vw_contracts` e seu impacto em homolog/prod.
- [ ] Definir proxima evolucao para views de dashboard e management sem depender de regras duplicadas em repository.

DoD:
- Views `MART` consumidas pela API ficam documentadas como contrato de leitura.
- Fallbacks existentes ficam explicitos e rastreaveis.

## S12-04 - Gate automatizado de data quality

- [x] Publicar script `scripts/db/data-quality-gate.mjs`.
- [x] Adicionar comando `npm run db:data-quality:gate`.
- [x] Cobrir o sumarizador com teste unitario.
- [x] Fazer o gate falhar quando o relatorio JSON tiver inconsistencias.
- [x] Publicar baseline diagnostica no CI em modo `warn-only`.
- [ ] Integrar o gate ao fechamento operacional da sprint e ao CI futuro.

DoD:
- Relatorio JSON versionado pode bloquear o fechamento tecnico.
- Time consegue rodar o gate localmente em modo estrito e em modo diagnostico.

## S12-05 - Atualizar documentacao operacional da base

- [x] Atualizar `docs/flyway_homolog_runbook.md`.
- [x] Atualizar `docs/data_dictionary.md` com inventario `APP` e `MART`.
- [x] Atualizar `docs/oracle_deploy_checklist.md` para priorizar Flyway e o gate de qualidade.
- [x] Consolidar um checklist unico de fechamento da Sprint 12 com evidencias de migracao + qualidade.

DoD:
- Time de dados/backend/operacao consulta a mesma fonte para migracao, validacao e troubleshooting.
- Sprint 13 recebe um contrato de dados mais claro e operavel.

## Sequencia sugerida (10 dias uteis)

1. Dia 1-2: inventario Flyway, entidades e consumo MART.
2. Dia 3-4: atualizar runbooks, dicionario e checklist Oracle.
3. Dia 5-6: publicar gate de qualidade e validar baseline atual.
4. Dia 7-8: revisar gaps de entidades core e dependencias de fallback.
5. Dia 9-10: consolidar evidencias e preparar handoff da Sprint 12 para Sprint 13.

## Dependencias da sprint

- Acesso ao baseline Oracle/homolog para validar migracoes reais.
- Alinhamento entre backend e dados sobre seeds controlados vs. massa operacional.
- Relatorio JSON de qualidade mantido atualizado pelo time responsavel pela base.

## Riscos e mitigacao

- Risco: documentacao continuar divergindo da trilha real de migracoes.
  Mitigacao: usar `database/flyway/sql` como fonte de verdade e refletir isso no runbook.
- Risco: gate de qualidade existir, mas sem ser executado de forma recorrente.
  Mitigacao: adicionar comando oficial em `package.json` e preparar integracao em CI.
- Risco: fallbacks `MART` esconderem problemas estruturais da base.
  Mitigacao: documentar fallback explicitamente e tratar gaps em Sprint 13.

## Evidencias esperadas

- Execucao do gate `db:data-quality:gate`.
- Runbook Flyway atualizado com `V001 -> V011`.
- Dicionario de dados refletindo `APP` e `MART`.
- Checklist Oracle alinhado ao fluxo versionado.
- Auditoria de legado publicada em `docs/sprint12_flyway_legacy_audit.md`.
- Baseline de data quality registrada em `docs/sprint12_data_quality_baseline.md`.
- Gap analysis estrutural publicado em `docs/sprint12_core_entities_gap_analysis.md`.
- Checklist de fechamento publicado em `docs/sprint12_closing_checklist.md`.
- Migration `database/flyway/sql/V011__sabesp_consumption_tables.sql` publicada com persistencia Oracle de consumo SABESP.

## Criterio de encerramento da Sprint 12

- Migracoes versionadas tratadas como trilha oficial da base.
- Camada `MART` documentada como contrato de leitura do backend.
- Gate de data quality publicado e pronto para bloquear fechamento de sprint.
- Documentacao operacional da base atualizada para homolog/prod.
