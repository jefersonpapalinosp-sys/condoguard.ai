# Estrategia de Testes Automatizados

## Objetivo

Garantir qualidade profissional cobrindo frontend, backend, API, fallback, health check e smoke tests com baixa fragilidade.

## Stack adotada

- Frontend (unit/component/integration): `Vitest` + `Testing Library`.
- Backend/API/contract/smoke: `pytest` + `FastAPI TestClient`.
- E2E: `Playwright`.

## Estrutura de testes

- `tests/unit`: regras de negocio, hooks/context e services.
- `tests/components`: componentes criticos de conectividade e estados.
- `tests/integration`: paginas principais e estados (loading/erro/vazio/sucesso).
- `backend/tests`: endpoints, contratos e smoke em cenarios mock/oracle.
- `tests/e2e`: fluxo E2E segmentado por dominio:
- `auth.e2e.spec.ts`
- `dashboard.e2e.spec.ts`
- `invoices.e2e.spec.ts`
- `alerts.e2e.spec.ts`
- `backend/data`: seeds reutilizaveis do backend FastAPI.

## Cobertura quantitativa (implementado)

- Comando base: `npm run test:coverage`
- Comando com gate: `npm run test:coverage:check`
- Relatorios gerados em `coverage/`:
- `coverage-summary.json` (automacao)
- `index.html` (analise visual)

Thresholds globais atuais:

- linhas: 75%
- funcoes: 75%
- statements: 75%
- branches: 65%

Thresholds por modulo critico (gate custom):

1. `services-criticos` (`http`, `apiStatus`, `invoicesService`): 80/80/80/70
2. `componentes-centrais` (`DataSourceBadge`, `ApiFallbackToast`): 70/70/70/60
3. `utilitarios-ui` (`LoadingState`, `ErrorState`, `EmptyState`): 90/90/90/90

## Decisoes tecnicas

1. Backend refatorado para testabilidade:
- FastAPI com entrypoint em `backend/app/main.py`.
- Runner oficial de execucao local/CI em `scripts/run-fastapi.mjs`.
- Testes de backend Python em `backend/tests` (`pytest`).

2. Testes de fallback:
- Services validam troca de fonte para `mock` e emissao de evento de indisponibilidade.
- Componentes validam `toast` e badge `Fonte: API real | fallback mock`.

3. Testes negativos de autenticacao/autorizacao:
- token invalido -> redireciona para login.
- sessao expirada -> redireciona para login.
- usuario sem permissao -> redireciona para dashboard.
- evento de `401` na camada HTTP -> logout forcado no contexto de auth.
- API sem token -> `401 AUTH_REQUIRED`.
- role sem permissao -> `403 FORBIDDEN`.
- CORS origem nao permitida -> `403 CORS_DENIED`.
- headers de seguranca validados em testes de API.
- rate limiting validado com `429 RATE_LIMITED`.

4. Testes de health e Oracle:
- Cenario `mock` validado.
- Cenario `oracle_pool_ok` com pool mockado.
- Cenario `oracle_error_fallback_seed` com falha mockada.

5. Contrato de API:
- Contratos validados em pytest para `/api/health`, `/api/invoices`, `/api/alerts`, `/api/management/units`, `/api/chat/*`, `/api/observability/*`, `/api/security/audit`.
- Contratos de erro padronizado (`error.code`, `error.message`, `error.details`).
- Contratos de metadados de listagem (`meta.page`, `meta.pageSize`, `meta.total`, `meta.totalPages`, `meta.hasNext`, `meta.hasPrevious`).
- Contratos de filtros/enums para endpoints criticos (`status`, `severity`, `block`).

6. Hardening adicional:
- CORS allowlist.
- rate limiting por escopo (`api` e `login`).
- auditoria de eventos de seguranca no backend.

## Lacunas e riscos atuais

1. E2E no ambiente local atual:
- Playwright instalado, mas o host Windows retornou `browserType.launch: spawn UNKNOWN` ao iniciar Chromium headless.
- Foi reportado warning de dependencia nativa do sistema (`lcms2-2.dll`) durante instalacao dos browsers.

2. Cobertura de autenticacao:
- JWT local ativo no backend FastAPI.
- OIDC/JWKS mantido por configuracao de ambiente e scripts de smoke dedicados.

3. Cobertura Oracle real:
- A validacao Oracle em testes automatizados usa mock de pool; conexao real depende de ambiente homolog e credenciais da Sprint 2.

## Como evoluir

1. Rodar E2E em pipeline CI com runner preparado para Playwright.
2. Adicionar testes de regressao visual para telas criticas.
3. Incluir cenarios de erro de negocio (status invalido, payload malformado) nas APIs.
