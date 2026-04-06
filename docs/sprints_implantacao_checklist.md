# Checklist de Implantacao por Sprint (CondoGuard.AI)

Data de referencia: 6 de abril de 2026

## Sprint 1 - Fundacao

- [x] Frontend base com navegacao principal.
- [x] API local com endpoints core e fallback mock.
- [x] Base SQL inicial e scripts Oracle.
- [x] Estrategia inicial de testes automatizados.
- [x] Documentacao operacional inicial.

Status da sprint: **concluida**.

## Sprint 2 - Oracle real e base de producao

- [x] `S2-01` Ambiente Oracle homolog e segredos da API.
- [x] `S2-02` Migracoes versionadas no fluxo homolog.
- [x] `S2-03` Fallback restrito para dev/hml.
- [x] `S2-04` Health detalhado com pool/latencia/erro resumido.
- [x] `S2-05` Smoke dos endpoints principais no Oracle.

Status da sprint: **concluida tecnicamente em homolog**.

## Sprint 3 - Seguranca, acesso e multi-condominio

- [ ] `S3-01` Autenticacao com identidade real (OIDC real em homolog) - **pendente de fechamento final**.
- [x] `S3-02` RBAC por perfil (`admin`, `sindico`, `morador`).
- [x] `S3-03` Isolamento por `condominium_id`.
- [x] `S3-04` Rate limit + CORS + validacao de payload.
- [x] `S3-05` Trilha de auditoria de acoes sensiveis.

Status da sprint: **em fechamento (1 item P0 pendente)**.

## Sprint 4 - Modulos de negocio

- [x] `S4-01` Financeiro com filtros, paginacao e exportacao CSV.
- [x] `S4-01` Fluxo de pagamento (`PATCH /api/invoices/:id/pay`) com persistencia.
- [x] `S4-02` Gestao de unidades com indicadores operacionais.
- [x] `S4-03` Alertas com severidade, historico e marcar como lido.
- [x] `S4-04` Padrao unico de resposta de listagens (`items/meta/filters/sort`).

Status da sprint: **concluida tecnicamente (local)**.

## Sprint 5 - IA CondoGuard

- [x] `S5-01` Catalogo de intents e prompts versionados.
- [x] `S5-02` Contexto real do condominio para o chat.
- [x] `S5-03` Guardrails de escopo/confianca/transparencia.
- [x] `S5-04` Telemetria + feedback de qualidade do chat.

Status da sprint: **concluida tecnicamente (local)**.

## Sprint 6 - Qualidade, testes e observabilidade

- [x] `S6-01` Expansao de testes unitarios criticos + gate de cobertura (`test:coverage:check`).
- [x] `S6-02` Workflow CI quality gate (`lint`, cobertura e e2e).
- [x] `S6-03` Jornadas E2E principais automatizadas e passando.
- [x] `S6-04` Endpoint backend de observabilidade (`/api/observability/metrics`).
- [x] `S6-04` Tela admin de observabilidade (`/observability`) com filtros e recarregar.
- [x] `S6-02` Job dedicado Oracle no CI com secrets e execucao verde (`run 24017181348`).
- [x] `S6-04` Alertas operacionais e catalogo final de logs estruturados.

Status da sprint: **concluida**.

## Sprint 7 - Go-live controlado

- [x] Automacao de gate de ambiente (`npm run env:validate`).
- [x] Smoke automatizado de homolog para fluxos criticos (`npm run release:s7:hml-smoke`).
- [x] Script de drill de rollback com relatorio (`npm run release:s7:rollback-drill`).
- [x] Runbook de go-live consolidado (`docs/sprint7_go_live_runbook.md`).
- [x] Runbook de rollback tecnico/dados (`docs/sprint7_rollback_runbook.md`).
- [x] Plano de rollout piloto documentado (`docs/sprint7_rollout_pilot_plan.md`).
- [x] Plano de treinamento e handoff documentado (`docs/sprint7_training_handoff_plan.md`).
- [x] FAQ operacional e trilha de escalonamento base (`docs/sprint7_operational_faq.md`).
- [x] Evidencia tecnica de smoke S7-01 (`docs/sprint7_hml_smoke_report.md`) com `failed=0`.
- [x] Evidencia tecnica de drill S7-03 (`docs/sprint7_rollback_drill_report.md`) com `recovery_failed=0` e `RTO=2s`.
- [ ] `S7-01` Homolog espelhando producao + identidade real validada.
- [ ] `S7-02` Rollout piloto.
- [ ] `S7-03` Runbook + simulacao de rollback.
- [ ] `S7-04` Treinamento e handoff final.

Status da sprint: **em andamento**.

## Validacao geral executada

- [x] `npm.cmd run lint`
- [x] `npm.cmd run test:all` (Vitest + Playwright)
