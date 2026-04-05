# Sprint 3 - Checklist de Fechamento

Data de referencia: 5 de abril de 2026  
Objetivo: concluir `S3-01`, `S3-02` e `S3-03` (P0) e preparar `S3-04`/`S3-05` (P1).

## Resumo atual

1. `S3-01` Autenticacao/identidade: **Parcial**
2. `S3-02` RBAC por perfil: **Done tecnico (pendente apenas gate OIDC de sprint)**
3. `S3-03` Escopo `condominium_id`: **Done tecnico (pendente apenas gate OIDC de sprint)**
4. `S3-04` Rate limit/CORS/payload: **Done tecnico**
5. `S3-05` Auditoria sensivel: **Done tecnico**

## P0 - Itens obrigatorios para fechar Sprint 3

## `S3-01` Autenticacao e identidade

Status: **Done tecnico**

- [x] Login/senha integrado com banco Oracle (`app.usuarios`).
- [x] JWT local validado no backend (`local_jwt`).
- [x] Base pluggable criada para provider (`local_jwt` + `oidc_jwks`).
- [x] Suporte tecnico para bloquear login por senha em `hml/prod` com OIDC (`AUTH_PASSWORD_LOGIN_ENABLED=false`).
- [ ] Configurar provedor corporativo real em homolog (`AUTH_PROVIDER=oidc_jwks`).
- [ ] Preencher `OIDC_ISSUER`, `OIDC_AUDIENCE`, `OIDC_JWKS_URL`, claims.
- [ ] Validar token real (assinatura, `iss`, `aud`, expiracao).
- [ ] Remover fluxo demo como principal em homolog/prod.

Evidencia obrigatoria:
- Requests reais com token do provedor corporativo em endpoint protegido (`2xx` com token valido, `401` com token invalido).
- Smoke de fechamento OIDC: `docs/sprint3_oidc_smoke_report.md` (gerado por `npm.cmd run security:smoke:sprint3:oidc -- -AccessToken "<TOKEN_REAL>"`).

## `S3-02` Autorizacao por perfil (`admin`, `sindico`, `morador`)

Status: **Done tecnico**

- [x] Middleware de role ativo no backend para rotas principais.
- [x] Consolidar matriz base de permissao por endpoint x role no backend (teste automatizado API).
- [x] Validar retornos `403` padronizados nos cenarios negados no backend.
- [x] Ajustar frontend para esconder/disable de acoes sem permissao.
- [x] Exibir feedback claro ao usuario quando rota for bloqueada por role.
- [x] Testar matriz completa (permitidos e negados) e versionar evidencias.

Evidencia obrigatoria:
- Matriz de permissao preenchida e anexada (pode usar `docs/sprint3_test_matrix.md`).
- Evidencia automatizada em homolog: `docs/sprint3_rbac_smoke_report.md`.

## `S3-03` Escopo `condominium_id` em queries e rotas

Status: **Parcial**

- [x] Escopo de tenant aplicado nas consultas Oracle principais.
- [x] Middleware de tenant ativo no backend (`requireTenant`).
- [x] Teste de regressao em repositorios Oracle garantindo bind/filtro por `condominium_id`.
- [x] Validar cenarios cross-tenant na suite automatizada (token tenant 2 sem acesso aos dados tenant 1 no mock).
- [x] Garantir por teste que token sem `condominium_id` recebe `INVALID_TENANT_SCOPE`.
- [x] Validar cenarios cross-tenant com 2 condominios reais no Oracle.
- [x] Garantir que token do condominio A nao acessa dados do B em homolog Oracle.
- [x] Registrar evidencias de bloqueio (`403`) e payload sem vazamento.

Evidencia obrigatoria:
- Execucao de testes `S3-03-T01..T05` com logs/prints.

## P1 - Pode fechar apos P0

## `S3-04` Rate limit + CORS restritivo + validacao de payload

- [x] Revisar CORS por ambiente (somente origins aprovadas).
- [x] Revisar limites por rota critica (`/api/auth/login`, etc.).
- [x] Expandir validacao de payload nas rotas de escrita.
- [x] Cobrir testes negativos de CORS/rate/payload.

## `S3-05` Auditoria de acoes sensiveis

- [x] Definir lista de acoes sensiveis (login, alteracoes criticas, acessos negados).
- [x] Persistir trilha de auditoria (nao apenas console).
- [x] Garantir rastreabilidade minima (`quem`, `quando`, `acao`, `resultado`).
- [x] Criar consulta/relatorio de auditoria para operacao.

Lista base definida (backend):
- `auth_login_success` / `auth_login_failed`
- `auth_missing_token`, `auth_invalid_token_*`, `auth_token_expired`
- `auth_forbidden_role`, `auth_invalid_tenant_scope`
- `cors_denied`
- `rate_limit_exceeded` (`api` e `login`)
- `api_error_response`
- `audit_log_viewed`

## Ordem recomendada (execucao)

1. Fechar `S3-01` (OIDC em homolog).
2. Fechar `S3-02` (matriz RBAC completa).
3. Fechar `S3-03` (cross-tenant validado em Oracle).
4. Executar `S3-04`.
5. Executar `S3-05`.

## Definicao de encerramento da Sprint 3

- `S3-01`, `S3-02` e `S3-03` em `Done` com evidencias.
- Provedor corporativo validado em homolog para auth real.
- Matriz RBAC completa com cenarios permitidos/negados.
- Isolamento por condominio comprovado sem vazamento.

## Evidencias executadas (05-APR-2026)

- `npm.cmd run db:smoke:sprint3:rbac -- -ApiBaseUrl "http://localhost:4001"`:
  - resultado: `PASS`, `failed=0`;
  - relatorio: `docs/sprint3_rbac_smoke_report.md`.
- `npm.cmd run db:smoke:sprint3 -- -ApiBaseUrl "http://localhost:4001" -Tenant1Email "admin@condoguard.ai" -Tenant1Password "password123" -Tenant2Email "admin.cond2@condoguard.ai" -Tenant2Password "password123"`:
  - resultado: `PASS` cross-tenant (sem vazamento por `condominium_id`).
- `npm.cmd run test:api`:
  - resultado: `20 passed`.
- `npm.cmd run test:contract`:
  - resultado: `4 passed`.
