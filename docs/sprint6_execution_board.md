# Sprint 6 - Execution Board (Qualidade, Testes e Observabilidade)

Data de referencia: 6 de abril de 2026

Objetivo da sprint: estabilizar a plataforma para escala e go-live com gates de qualidade e observabilidade.

## Status resumido

- `S6-01` Testes unitarios de servicos e repositorios criticos: **concluido**
- `S6-02` Integracao API + Oracle no CI: **concluido**
- `S6-03` E2E das jornadas principais no CI: **concluido**
- `S6-04` Logs estruturados + metricas + alertas operacionais: **concluido**

## S6-01 - Backlog tecnico

- [x] Definir baseline e gate de cobertura (`test:coverage:check`).
- [x] Expandir unit tests para modulos criticos de chat:
  - `chatIntentsRepo`
  - `chatTelemetryRepo`
- [x] Expandir unit tests de servicos criticos (invoices).
- [ ] Revisar cobertura por arquivo critico e registrar baseline final da sprint.

## S6-02 - Backlog tecnico

- [x] Criar workflow de quality gate no GitHub Actions: `.github/workflows/ci-quality.yml`.
- [x] Bloquear merge por falha de `lint` + `test:coverage:check` + `test:e2e`.
- [x] Publicar job Oracle dedicado no CI (`oracle-smoke`) condicionado a secrets.
- [x] Publicar guia de secrets Oracle para GitHub Actions (`docs/github_actions_oracle_secrets.md`).
- [x] Confirmar secrets Oracle no repositorio GitHub e evidenciar execucao verde do job (`run 24017181348`).

## S6-03 - Backlog tecnico

- [x] Publicar job de Playwright no CI com artefatos (`playwright-report`, `test-results`).
- [x] Definir politica de retry para E2E (`retries=2` em CI).
- [x] Reter evidencias de falha (`trace`, `screenshot`, `video`).

## S6-04 - Backlog tecnico

- [x] Expor endpoint de metricas operacionais (`GET /api/observability/metrics`).
- [x] Criar painel frontend admin de observabilidade (`/observability`) com filtros e recarregar.
- [x] Consolidar catalogo de logs estruturados por dominio (`docs/observability_log_catalog.md`).
- [x] Evoluir metrica de fallback por modulo no backend.
- [x] Definir endpoint de alertas operacionais por threshold (`GET /api/observability/alerts`).
- [x] Definir canal externo de notificacao por webhook (`OBS_ALERT_CHANNEL=webhook` + `OBS_ALERT_WEBHOOK_URL`) com endpoint de dispatch manual (`POST /api/observability/alerts/dispatch`).
- [x] Configurar framework de canal externo e validacao funcional via endpoint de dispatch.

## Comandos Windows (PowerShell)

```powershell
cd C:\Users\Camila\Desktop\Senac\workspace\CondoGuard.AI\condoguard.ai
npm.cmd run lint
npm.cmd run test:api
npm.cmd run test:all
```

## Encerramento da Sprint 6

- Resultado do CI Quality Gate: **success** (`run 24017181348`).
- Jobs validados:
  - `Lint + Coverage Gate` PASS
  - `Playwright E2E` PASS
  - `Oracle Health Smoke` PASS
