# CondoGuard.AI

Plataforma de inteligencia predial em React + Vite.

## Requisitos

- Node.js 20+
- npm 10+
- Python 3 (para pipeline de dados)

## Execucao local

1. Instale dependencias:
   `npm install`
2. Instale dependencias do backend Python:
   `py -m pip install -r backend/requirements.txt`
3. Configure variaveis em `.env`
4. Rode frontend:
   `npm run dev`
5. Rode API local (FastAPI):
   `npm run api:dev`
6. Se aparecer `No module named uvicorn`, rode:
   `py -m pip install -r backend/requirements.txt`

No PowerShell com politica restrita, use `npm.cmd` em vez de `npm`.

Credenciais locais de desenvolvimento (P0 auth):

- `admin@condoguard.ai` / `password123`
- `sindico@condoguard.ai` / `password123`
- `morador@condoguard.ai` / `password123`

## Scripts

- `npm run dev`: frontend
- `npm run api:dev`: API FastAPI local
- `npm run api:dev:mock`: API FastAPI local (usa DB_DIALECT do ambiente)
- `npm run api:dev:oracle`: API FastAPI local (usa DB_DIALECT do ambiente)
- `npm run api:start:mock`: API FastAPI mock sem reload (ideal para CI/E2E)
- `npm run api:start:oracle`: API FastAPI Oracle sem reload (ideal para CI)
- `npm run db:migrate:flyway`: executa migracoes Flyway no Oracle
- `npm run db:data-quality:gate`: executa o gate estrito do relatorio versionado de qualidade
- `npm run db:data-quality:gate:warn`: executa o gate em modo diagnostico
- `npm run db:smoke:sprint3`: smoke cross-tenant (Sprint 3) em Oracle
- `npm run db:smoke:sprint3:rbac`: smoke de matriz RBAC (Sprint 3) e gera relatorio markdown
- `npm run security:smoke:sprint3:oidc`: smoke de fechamento S3-01 com token real OIDC e relatorio markdown
- `npm run security:smoke:s3:s7:oidc-gate`: gate unificado OIDC (S3-01 + S7-01) com relatorio consolidado
- `npm run build`: build de producao
- `npm run lint`: typecheck
- `npm run check`: lint + build
- `npm run clean`: limpa `dist`

## API Integration (Fallback)

- `src/services/http.ts` usa `VITE_API_BASE_URL`.
- Politica de fallback frontend:
  - `VITE_ENABLE_MOCK_FALLBACK=true|false` (override explicito)
  - se nao definido: fallback mock **ativo em dev** e **desativado em hml/prod**.
- Retry automatico para falhas de rede/timeout/5xx.
- Toast de conectividade + badge visual de fonte (`API real`, `fallback mock` ou `indefinida`).

## Paginas do frontend

- `/dashboard`: visao executiva de indicadores.
- `/alerts`: central de alertas.
- `/consumption`: consumo e utilidades.
- `/contracts`: contratos e vigencias.
- `/invoices`: financeiro e faturas.
- `/chat`: assistente CondoGuard.
- `/management`: gestao de unidades.
- `/cadastros-gerais`: centro de cadastros de unidades, moradores, fornecedores e servicos.
- `/reports`: relatorios operacionais.
- `/settings`: configuracoes da plataforma.

## Banco e Qualidade de Dados

Arquivos implementados:

- Migracoes versionadas: `database/flyway/sql/V001__core_schema.sql` ate `V010__enel_integration_tables.sql`
- Runbook operacional: `docs/flyway_homolog_runbook.md`
- Checklist Oracle: `docs/oracle_deploy_checklist.md`
- Pipeline de analise/saneamento: `scripts/data/analyze_and_project.py`
- Relatorio gerado: `database/reports/data_quality_report.json`
- Gate de qualidade: `scripts/db/data-quality-gate.mjs`

Executar analise com a planilha:

```powershell
py -3 scripts/data/analyze_and_project.py --xlsx "c:\Users\Camila\Downloads\CondoGuardAI - Base de Dados.xlsx"
```

Saidas:

- `database/reports/data_quality_report.json`
- `backend/data/invoices.json`
- `backend/data/management_units.json`
- `backend/data/chat_bootstrap.json`
- `backend/data/alerts.json`

Validar a baseline versionada:

```bash
npm run db:data-quality:gate:warn
npm run db:data-quality:gate
```

## Oracle (Sprint 1 adiantado)

- Trilha oficial atual: `database/flyway/sql`.
- Scripts em `database/sql/oracle` ficam como referencia historica/controlada, nao como fluxo operacional principal.
- Guia rapido: docs/oracle_setup.md.
- Checklist de deploy: docs/oracle_deploy_checklist.md.
- Config local: `.env`.
- Plano completo das proximas sprints: docs/product_backlog_sprints.md.
- Board de execucao da Sprint 1: docs/sprint1_execution_board.md.
- Checklist de fechamento da Sprint 1: docs/sprint1_closing_checklist.md.
- Board executavel da Sprint 2: docs/sprint2_execution_board.md.
- Checklist de fechamento da Sprint 2: docs/sprint2_closing_checklist.md.
- Runbook Flyway homolog: docs/flyway_homolog_runbook.md.
- Relatorio de smoke Oracle da Sprint 2: docs/sprint2_oracle_smoke_report.md.
- Board executavel da Sprint 3: docs/sprint3_execution_board.md.
- Board executavel da Sprint 8 (eliminacao de sintetico): docs/sprint8_execution_board.md.
- Templates de issues da Sprint 2 (GitHub):
  - docs/github_issues/s2-01_oracle_homolog_segredos.md
  - docs/github_issues/s2-02_migracoes_flyway.md
  - docs/github_issues/s2-03_fallback_seed_dev_hml.md
  - docs/github_issues/s2-04_health_detalhado.md
  - docs/github_issues/s2-05_smoke_endpoints_oracle.md
- Estrategia de testes: docs/testing_strategy.md.
- Direcao visual (Design System): docs/design_system_monolith.md.


Backend por dialeto (FastAPI): `backend/app/main.py` usa `DB_DIALECT=oracle|mock`.
Entrypoint local padrao: `npm run api:dev` (runner em `scripts/run-fastapi.mjs`).
Controle de fallback Oracle:
- `APP_ENV=dev|hml`: fallback seed permitido por padrao.
- `APP_ENV=prod`: fallback seed bloqueado por padrao (erro explicito 503 se Oracle indisponivel).
- Override opcional: `ALLOW_ORACLE_SEED_FALLBACK=true|false`.

Health detalhado (Sprint 2):
- `/api/health` retorna `env`, `poolStatus`, `latencyMs` e `errorSummary`.

## Testes automatizados

- `npm run test`: suite principal de frontend (Vitest, sem backend legado Node)
- `npm run test:frontend`: alias explicito da suite frontend
- `npm run test:unit`
- `npm run test:component`
- `npm run test:integration`
- `npm run test:api`: paridade de API FastAPI (pytest)
- `npm run test:contract`: contratos FastAPI (pytest)
- `npm run test:smoke`: smoke FastAPI (pytest)
- `npm run test:coverage`
- `npm run test:coverage:check`
- `npm run test:e2e`: Playwright E2E
- `npm run test:e2e:install`: instala browsers do Playwright
- `npm run test:py`: testes do backend FastAPI (`backend/tests`)
- `npm run env:validate`: valida perfil de ambiente (`.env`, com fallback interno para `.env.local` se existir) para gate de go-live
- `npm run release:s7:hml-smoke`: smoke dos fluxos criticos para gate da Sprint 7 (`S7-01`)
- `npm run release:s7:rollback-drill`: simulacao assistida de rollback com relatorio (`S7-03`)

## Deprecacao do backend Node

- Backend oficial: **FastAPI** (`backend/app/main.py`).
- Planejamento de remocao do legado: `docs/backend_node_decommission_checklist.md`.

## Chat IA (Sprint 5)

Endpoints principais:

- `GET /api/chat/intents`: catalogo versionado de intents/prompts.
- `GET /api/chat/context`: contexto consolidado por condominio.
- `POST /api/chat/message`: resposta do assistente com metadados de transparencia (`intentId`, `confidence`, `sources`, `limitations`, `guardrails`).
- `POST /api/chat/feedback`: registra feedback (`messageId`, `rating=up|down`, `comment?`).
- `GET /api/chat/telemetry`: snapshot de qualidade (mensagens, bloqueios, fallback, score de satisfacao, eventos recentes).

Validacao manual (Windows PowerShell):

```powershell
cd C:\Users\Camila\Desktop\Senac\workspace\CondoGuard.AI\condoguard.ai
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/auth/login" -ContentType "application/json" -Body '{"email":"admin@condoguard.ai","password":"password123"}'
$headers = @{ Authorization = "Bearer $($login.token)" }
$msg = Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/chat/message" -Headers $headers -ContentType "application/json" -Body '{"message":"Resumo financeiro do condominio"}'
Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/chat/feedback" -Headers $headers -ContentType "application/json" -Body (@{ messageId = $msg.id; rating = "up" } | ConvertTo-Json)
Invoke-RestMethod -Method Get -Uri "http://localhost:4000/api/chat/telemetry?limit=20" -Headers $headers | ConvertTo-Json -Depth 10
```

## Segurança (P0)

- JWT no backend com expiração (`JWT_SECRET`, `JWT_EXPIRES_IN`).
- RBAC no backend:
- `admin` e `sindico`: `/api/invoices`, `/api/management/units`
- `admin`, `sindico`, `morador`: `/api/alerts`, `/api/chat/bootstrap`, `/api/chat/message`
- CORS por allowlist (`CORS_ALLOWED_ORIGINS`).
- Headers de hardening no backend FastAPI.

## Segurança (P1)

- Rate limiting global de API e especifico de login.
- Auditoria estruturada de eventos de segurança no backend (`[security] ...` em JSON).
- Eventos auditados: login sucesso/falha, token ausente/invalido/expirado, role proibida, CORS negado, rate limit excedido, resposta de erro.
- Persistencia opcional da trilha de auditoria em JSONL:
  - `SECURITY_AUDIT_PERSIST_ENABLED=true|false`
- `SECURITY_AUDIT_LOG_PATH=logs/security-audit.log`
- Consulta operacional (admin): `GET /api/security/audit?event=&actorSub=&condominiumId=&from=&to=&limit=`

## Observabilidade (Sprint 6)

- Endpoint operacional de métricas (admin):
  - `GET /api/observability/metrics?routeLimit=10&codeLimit=10`
- Retorna:
  - contadores de requests/erros e taxa de erro
  - latência (`avg`, `p95`, `max`)
  - distribuição por classe de status (`2xx`, `4xx`, `5xx`)
  - top rotas e códigos de erro mais frequentes

E2E segmentados por dominio:
- `tests/e2e/auth.e2e.spec.ts`
- `tests/e2e/dashboard.e2e.spec.ts`
- `tests/e2e/invoices.e2e.spec.ts`
- `tests/e2e/alerts.e2e.spec.ts`




### Observabilidade - atualizacoes Sprint 6

- Endpoints operacionais (admin):
  - `GET /api/observability/metrics?routeLimit=10&codeLimit=10`
  - `GET /api/observability/alerts`
- O snapshot de metricas agora inclui fallback por modulo (`fallbacks.total` e `fallbacks.modules`).
- O endpoint de alertas retorna violacoes de threshold para latencia p95, taxa de erro e volume de fallback.

Variaveis de threshold:
- `OBS_ALERT_P95_LATENCY_MS` (default `1200`)
- `OBS_ALERT_ERROR_RATE_PCT` (default `5`)
- `OBS_ALERT_FALLBACK_COUNT` (default `3`)
- `OBS_ALERT_CHANNEL` (default `log`)

### Sprint 6 - CI Oracle e webhook de observabilidade

- Guia de setup dos secrets Oracle no GitHub Actions:
  - `docs/github_actions_oracle_secrets.md`
- Novo endpoint admin para dispatch manual de alertas operacionais:
- `POST /api/observability/alerts/dispatch`
- Configuracao de webhook de alertas:
  - `OBS_ALERT_CHANNEL=webhook`
  - `OBS_ALERT_WEBHOOK_URL=https://seu-endpoint`
  - `OBS_ALERT_WEBHOOK_TIMEOUT_MS=5000`

## Go-live controlado (Sprint 7)

- Runbook unico de go-live: `docs/sprint7_go_live_runbook.md`
- Runbook de rollback tecnico/dados: `docs/sprint7_rollback_runbook.md`
- Plano de rollout piloto: `docs/sprint7_rollout_pilot_plan.md`
- Plano de treinamento/handoff: `docs/sprint7_training_handoff_plan.md`
- FAQ operacional e escalonamento: `docs/sprint7_operational_faq.md`
- Checklist de decisao Go/No-Go: `docs/sprint7_go_no_go_checklist.md`
- Template de ata de handoff: `docs/sprint7_handoff_minutes_template.md`

## Deploy no EasyPanel (Hostinger)

Configure dois servicos separados:

- `frontend`
  - Build context: `.`
  - Dockerfile path: `Dockerfile`
  - Porta interna: `80`
  - Build args: `VITE_API_BASE_URL`, `VITE_APP_ENV`, `VITE_ENABLE_MOCK_FALLBACK`
- `backend`
  - Build context: `backend`
  - Dockerfile path: `Dockerfile`
  - Porta interna: `4000`
  - Env vars: `APP_ENV`, `DB_DIALECT`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`, `ORACLE_*` (quando `DB_DIALECT=oracle`)

Importante:

- Nao use `Dockerfile` como pasta/contexto no EasyPanel.
- Se o painel pedir `.env file path`, deixe vazio ou use `.env` na raiz correta do servico.
