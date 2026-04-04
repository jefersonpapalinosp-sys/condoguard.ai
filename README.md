# CondoGuard.AI

Plataforma de inteligencia predial em React + Vite.

## Requisitos

- Node.js 20+
- npm 10+
- Python 3 (para pipeline de dados)

## Execucao local

1. Instale dependencias:
   `npm install`
2. Configure variaveis em `.env.local`
3. Rode frontend:
   `npm run dev`
4. Rode API local (seed):
   `npm run api:dev`

No PowerShell com politica restrita, use `npm.cmd` em vez de `npm`.

Credenciais locais de desenvolvimento (P0 auth):

- `admin@condoguard.ai` / `password123`
- `sindico@condoguard.ai` / `password123`
- `morador@condoguard.ai` / `password123`

## Scripts

- `npm run dev`: frontend
- `npm run api:dev`: API Express local
- `npm run api:dev:mock`: API local forçando seed mock
- `npm run api:dev:oracle`: API local forçando Oracle
- `npm run build`: build de producao
- `npm run lint`: typecheck
- `npm run check`: lint + build
- `npm run clean`: limpa `dist`

## API Integration (Fallback)

- `src/services/http.ts` usa `VITE_API_BASE_URL`.
- Se API falhar, `Invoices`, `Chat`, `Management` e `Alerts` usam fallback para mock.
- Retry automatico para falhas de rede/timeout/5xx.
- Toast de conectividade + badge visual de fonte (`API real` ou `fallback mock`).

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

- Modelo: `database/sql/001_core_schema.sql`
- Marts: `database/sql/002_marts_views.sql`
- Testes de qualidade: `database/sql/003_data_quality_tests.sql`
- Pipeline de analise/saneamento: `scripts/data/analyze_and_project.py`
- Relatorio gerado: `database/reports/data_quality_report.json`

Executar analise com a planilha:

```powershell
py -3 scripts/data/analyze_and_project.py --xlsx "c:\Users\Camila\Downloads\CondoGuardAI - Base de Dados.xlsx"
```

Saidas:

- `database/reports/data_quality_report.json`
- `server/data/invoices.json`
- `server/data/management_units.json`
- `server/data/chat_bootstrap.json`
- `server/data/alerts.json`


## Oracle (Sprint 1 adiantado)

- Scripts Oracle: database/sql/oracle/001_core_schema_oracle.sql, database/sql/oracle/002_marts_views_oracle.sql, database/sql/oracle/003_data_quality_tests_oracle.sql.
- Guia rapido: docs/oracle_setup.md.
- Checklist de deploy: docs/oracle_deploy_checklist.md.
- Config local: `.env.local` (carregado automaticamente pela API).
- Plano completo das proximas sprints: docs/product_backlog_sprints.md.
- Board executavel da Sprint 2: docs/sprint2_execution_board.md.
- Board executavel da Sprint 3: docs/sprint3_execution_board.md.
- Estrategia de testes: docs/testing_strategy.md.
- Direcao visual (Design System): docs/design_system_monolith.md.


Backend por dialeto (ja implementado): server/index.mjs usa DB_DIALECT=oracle|mock com fallback para seed.

## Testes automatizados

- `npm run test`: suite Vitest completa (unit, component, integration, api, contract, smoke)
- `npm run test:unit`
- `npm run test:component`
- `npm run test:integration`
- `npm run test:api`
- `npm run test:contract`
- `npm run test:smoke`
- `npm run test:coverage`
- `npm run test:coverage:check`
- `npm run test:e2e`: Playwright E2E
- `npm run test:e2e:install`: instala browsers do Playwright

## Segurança (P0)

- JWT no backend com expiração (`JWT_SECRET`, `JWT_EXPIRES_IN`).
- RBAC no backend:
- `admin` e `sindico`: `/api/invoices`, `/api/management/units`
- `admin`, `sindico`, `morador`: `/api/alerts`, `/api/chat/bootstrap`, `/api/chat/message`
- CORS por allowlist (`CORS_ALLOWED_ORIGINS`).
- Headers de hardening via `helmet`.

## Segurança (P1)

- Rate limiting global de API e especifico de login.
- Auditoria estruturada de eventos de segurança no backend (`[security] ...` em JSON).
- Eventos auditados: login sucesso/falha, token ausente/invalido/expirado, role proibida, CORS negado, rate limit excedido, resposta de erro.

E2E segmentados por dominio:
- `tests/e2e/auth.e2e.spec.ts`
- `tests/e2e/dashboard.e2e.spec.ts`
- `tests/e2e/invoices.e2e.spec.ts`
- `tests/e2e/alerts.e2e.spec.ts`

