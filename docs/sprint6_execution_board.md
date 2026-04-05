# Sprint 6 - Execution Board (Qualidade, Testes e Observabilidade)

Data de referencia: 5 de abril de 2026

Objetivo da sprint: estabilizar a plataforma para escala e go-live com gates de qualidade e observabilidade.

## Status resumido

- `S6-01` Testes unitarios de servicos e repositorios criticos: **em progresso**
- `S6-02` Integracao API + Oracle no CI: **pendente**
- `S6-03` E2E das jornadas principais no CI: **pendente**
- `S6-04` Logs estruturados + metricas + alertas operacionais: **pendente**

## S6-01 - Backlog tecnico

- [x] Definir baseline e gate de cobertura (`test:coverage:check`).
- [x] Expandir unit tests para modulos criticos de chat:
  - `chatIntentsRepo`
  - `chatTelemetryRepo`
- [ ] Revisar cobertura por arquivo critico e registrar baseline final da sprint.

## S6-02 - Backlog tecnico

- [x] Criar workflow de quality gate no GitHub Actions: `.github/workflows/ci-quality.yml`.
- [x] Bloquear merge por falha de `lint` + `test:coverage:check` + `test:e2e`.
- [ ] Evoluir job de integração Oracle dedicado (segredo/ambiente homolog controlado).

## S6-03 - Backlog tecnico

- [ ] Publicar job de Playwright no CI com artefatos (`trace`, `screenshot`, `video` quando falhar).
- [ ] Definir política de retry flake para E2E.

## S6-04 - Backlog tecnico

- [x] Expor endpoint de métricas operacionais mínimas (latência, erro, classes HTTP, top rotas/códigos): `GET /api/observability/metrics`.
- [x] Criar painel frontend admin para observabilidade (`/observability`) consumindo endpoint de métricas.
- [ ] Consolidar catálogo de eventos de log estruturado por domínio.
- [ ] Evoluir métrica de fallback por módulo no backend (quando aplicável ao fluxo server-side).
- [ ] Definir alertas operacionais (threshold e canal).

## Comandos Windows (PowerShell)

```powershell
cd C:\Users\Camila\Desktop\Senac\workspace\CondoGuard.AI\condoguard.ai
npm.cmd run test:unit
npm.cmd run test:coverage:check
```
