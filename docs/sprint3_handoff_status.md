# Sprint 3 - Handoff (Status Atual)

Data de referencia: 5 de abril de 2026

## Resumo executivo

1. `S3-01` (P0): **Parcial (gate final OIDC real)**
2. `S3-02` (P0): **Done tecnico**
3. `S3-03` (P0): **Done tecnico**
4. `S3-04` (P1): **Done tecnico**
5. `S3-05` (P1): **Done tecnico**

## Feito (evidencia tecnica)

1. Auth pluggable (`local_jwt` + `oidc_jwks`) com validacao de token no backend.
2. RBAC backend ativo e guardas frontend para rotas/menus restritos (`invoices`, `management`).
3. Escopo tenant aplicado em middleware e repositorios (queries Oracle com `condominio_id`).
4. Protecoes de seguranca reforcadas:
   - CORS allowlist;
   - rate limit global e de login;
   - validacao de payload em rotas criticas.
5. Auditoria sensivel:
   - log estruturado;
   - persistencia em JSONL;
   - consulta operacional admin (`GET /api/security/audit`).

## Testes recentes executados

- `npm.cmd run db:smoke:sprint3:rbac -- -ApiBaseUrl "http://localhost:4000"`:
  - `PASS`, `failed=0`.
- `npm.cmd run db:smoke:sprint3 -- -ApiBaseUrl "http://localhost:4000" -Tenant1Email "admin@condoguard.ai" -Tenant1Password "password123" -Tenant2Email "admin.cond2@condoguard.ai" -Tenant2Password "password123"`:
  - `PASS` (isolamento cross-tenant validado no Oracle).
- `npm.cmd run test:api`:
  - `20 passed`.
- `npm.cmd run test:contract`:
  - `4 passed`.

- Suites focadas de API/contract/unit/integration passando localmente (26 testes no ultimo ciclo principal).
- Regressao de tenant em repositorios Oracle adicionada e validada.

## Pendencias para fechar P0 da Sprint 3

1. `S3-01`:
   - configurar e validar provedor corporativo real em homolog (`AUTH_PROVIDER=oidc_jwks`).
   - executar smoke OIDC final com token real emitido pelo IdP corporativo.

## Pendencias residuais P1

1. Publicar/assinar a decisao operacional de retencao da trilha de auditoria.

## Referencias

- `docs/sprint3_execution_board.md`
- `docs/sprint3_test_matrix.md`
- `docs/sprint3_closing_checklist.md`
- `docs/sprint3_oidc_homolog_setup.md`

