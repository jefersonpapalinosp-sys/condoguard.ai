# Status Mestre de Sprints (CondoGuard.AI)

Data de referencia: 6 de abril de 2026
Fonte: consolidado de `product_backlog_sprints.md`, checklists e boards das sprints.
Checklist operacional consolidado: `docs/sprints_implantacao_checklist.md`.

## Sprint 1 - Fundacao

Status geral: Concluida

Feito:
- Frontend base com navegacao principal.
- API local com endpoints core e fallback mock.
- Base SQL inicial e scripts Oracle equivalentes.
- Estrategia inicial de testes automatizados.
- Documentacao base de setup/operacao.

Pendente:
- Sem pendencias bloqueantes da propria sprint (itens migrados para Sprint 2 por escopo).

Melhorias sugeridas:
- Revisar periodicamente onboarding do ambiente para reduzir tempo de setup de novos devs.

## Sprint 2 - Oracle real e base de producao

Status geral: Concluida tecnicamente em homolog (com evidencias de smoke/health)

Feito:
- `S2-01`: health Oracle validado (`dialect=oracle`, `dbStatus=oracle_pool_ok`).
- `S2-02`: migracoes versionadas aplicadas no fluxo de homolog.
- `S2-03`: fallback ajustado para ambientes nao-producao.
- `S2-04`: health detalhado com `poolStatus`, `latencyMs`, `errorSummary`.
- `S2-05`: smoke dos endpoints principais em Oracle com relatorio.

Pendente:
- Fechamentos de producao permanecem fora de escopo da Sprint 2 (conforme planejamento).

Melhorias sugeridas:
- Congelar runbook final de deploy Oracle com checklist operacional unico.

## Sprint 3 - Seguranca, acesso e multi-condominio

Status geral: Em fechamento (P0 quase concluido)

Feito:
- `S3-02` (RBAC): done tecnico com smoke report.
- `S3-03` (isolamento por `condominium_id`): done tecnico com smoke cross-tenant PASS.
- `S3-04` (rate limit/CORS/validacao): done tecnico.
- `S3-05` (auditoria de acoes sensiveis): done tecnico.
- Ajustes de frontend para reduzir comportamento "mock invisivel" em modulos ainda nao fechados.

Pendente:
- `S3-01` gate final: homologacao com OIDC real do provedor corporativo (issuer/audience/JWKS reais + token real).
- Consolidar evidencias finais de fechamento em um unico pacote (runbook + smoke + prints).

Melhorias sugeridas:
- Padronizar script unico de smoke de autenticacao (local_jwt e oidc_jwks com parametros claros para Windows).
- Travar criterio de "Done" para evitar divergencia de status entre docs.

## Sprint 4 - Modulos de negocio

Status geral: Fechada tecnicamente (local)

Feito:
- `S4-01` Financeiro: filtros, paginacao e exportacao CSV funcional (`/api/invoices/export.csv` + UI de exportacao).
- `S4-01` Financeiro: fluxo de pagamento integrado (`PATCH /api/invoices/:id/pay`) com persistencia e reflexo na UI.
- `S4-02` Gestao de unidades: indicadores operacionais reais (ocupacao, inadimplencia, pendencias) no endpoint e na tela.
- `S4-03` Alertas: ciclo completo com historico paginado, filtro por estado (`active/read`) e acao `marcar como lido` persistente.
- `S4-04` Padrao unico de listagens: consolidado em `items/meta/filters/sort` com `search`, `sortBy`, `sortOrder`.
- Suites validadas em ambiente local:
  - `lint`: PASS
  - `test` (Vitest completo): 65/65 PASS
  - `test:e2e` (Playwright): 7/7 PASS

Pendente:
- Validacao final de regressao completa em ambiente de homologacao com o gate de identidade real (`S3-01`) (adiada por decisao de planejamento).

Melhorias sugeridas:
- Manter `docs/sprint4_closing_checklist.md` atualizado com cada rodada de regressao.
- Expandir cobertura E2E dedicada para os fluxos novos de CSV e `mark as read`.

## Sprint 5 - IA CondoGuard

Status geral: Fechada tecnicamente (local)

Feito:
- `S5-01` Catalogo de intents e prompts versionados (`/api/chat/intents`).
- `S5-02` Contexto real do condominio para chat (`/api/chat/context` + agregacoes por tenant).
- `S5-03` Guardrails de bloqueio/transparencia (`guardrails`, `confidence`, `sources`, `limitations`).
- `S5-04` Telemetria de qualidade (`/api/chat/telemetry`, `/api/chat/feedback`, eventos e score de satisfacao).
- Feedback de utilidade habilitado na tela `/chat` e no `ChatbotWidget`.
- Suites de validacao da sprint executadas com PASS:
  - `lint`: PASS
  - `test:api`: PASS
  - `test:integration -- Chat.integration.test.tsx`: PASS

Pendente:
- Validar o fluxo completo em homolog apos fechamento do gate de identidade real (`S3-01`), para evidenciar comportamento com token corporativo.

Melhorias sugeridas:
- Definir retention/expurgo da telemetria de chat para ambiente produtivo.
- Publicar painel operacional (dashboard) para consumo de telemetria pela equipe de produto/operacao.

## Sprint 6 - Qualidade, testes e observabilidade

Status geral: Concluida

Feito:
- Suites locais de testes e E2E ja operacionais no projeto.
- `S6-01` iniciado com expansao de unit tests para modulos criticos de chat (`chatIntentsRepo`, `chatTelemetryRepo`).
- Board de execucao publicado: `docs/sprint6_execution_board.md`.
- Gate de cobertura validado com `npm.cmd run test:coverage:check` (PASS).
- Workflow CI criado: `.github/workflows/ci-quality.yml` com bloqueio por `lint`, cobertura e E2E.
- Job Oracle dedicado no CI publicado (`oracle-smoke`), condicionado a secrets.
- Guia de setup de secrets Oracle publicado: `docs/github_actions_oracle_secrets.md`.
- Artefatos E2E ampliados no CI (`playwright-report`, `test-results`) com `trace`, `screenshot` e `video` em falha.
- Observabilidade backend evoluida com fallback por modulo e alertas por threshold (`/api/observability/alerts`).
- Canal externo de alerta por webhook implementado com dispatch manual (`/api/observability/alerts/dispatch`).
- Catalogo de logs estruturados publicado: `docs/observability_log_catalog.md`.
- Execucao final de CI validada com sucesso (`run 24017181348`):
  - `Lint + Coverage Gate`: PASS
  - `Playwright E2E`: PASS
  - `Oracle Health Smoke`: PASS

Pendente:
- Sem bloqueios tecnicos da sprint. Ajustes de threshold/canal podem evoluir como melhoria continua na Sprint 7.

Melhorias sugeridas:
- Publicar baseline de qualidade (cobertura, flakiness, tempo medio de pipeline).

## Sprint 7 - Go-live controlado

Status geral: Em andamento

Feito:
- Matriz de ambientes congelada (`docs/environment_matrix_s7.md`).
- Validador de perfil de ambiente (`npm run env:validate`).
- Script de smoke de homolog para gate tecnico (`npm run release:s7:hml-smoke`).
- Script de drill de rollback com relatorio (`npm run release:s7:rollback-drill`).
- Runbook unificado de go-live (`docs/sprint7_go_live_runbook.md`).
- Plano de rollout piloto e handoff documentados.
- Smoke tecnico executado com sucesso:
  - `docs/sprint7_hml_smoke_report.md` -> `failed=0`
- Drill tecnico executado com sucesso:
  - `docs/sprint7_rollback_drill_report.md` -> `recovery_failed=0`, `RTO=2s`

Pendente:
- `S7-01` homolog espelhando producao com identidade real validada.
- `S7-02` rollout piloto controlado.
- `S7-03` runbook e simulacao de rollback.
- `S7-04` treinamento e handoff final.

Melhorias sugeridas:
- Definir criterios de go/no-go com donos claros por area (produto, backend, dados, operacao).

## Riscos transversais atuais

1. Divergencia de status entre documentos de sprint (necessita fonte unica de verdade).
2. Fechamento de `S3-01` depende de credenciais/config real de OIDC em homolog.
3. Parte do frontend ainda exibe dados sinteticos em modulos de sprint futura.

## Plano objetivo para fechar Sprint 3

1. Fechar `S3-01` com OIDC real em homolog (issuer/audience/JWKS e token real).
2. Rodar smoke OIDC final e anexar relatorio PASS.
3. Atualizar `sprint3_closing_checklist.md` e `sprint3_handoff_status.md` com status final unico.
4. Congelar pacote de evidencias (health, smoke, matriz de testes, checklist).
