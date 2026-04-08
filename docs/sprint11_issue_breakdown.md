# Sprint 11 - Quebra Tecnica e Issues

Data de referencia: 8 de abril de 2026

Objetivo deste documento:
- transformar a Sprint 11 em cards executaveis;
- explicitar dependencias;
- sugerir escopo de arquivo e ordem de entrega;
- servir como ponte para o board e para as issues em `docs/github_issues/`.

## Ordem recomendada de execucao

1. `S11-01` OIDC/JWKS real em homolog
2. `S11-02` Sessao unificada frontend/backend
3. `S11-03` Tenant scope end-to-end por `condominio_id`
4. `S11-04` `trace_id` ponta a ponta
5. `S11-05` Smoke de seguranca e tenancy

## Mapa executivo das issues

| Card | Prioridade | Estimativa | Dono sugerido | Dependencias | Documento |
| --- | --- | --- | --- | --- | --- |
| `S11-01` | `P0` | `5 pts` | Backend/Auth + DevOps | IdP homolog, claims reais | `docs/github_issues/s11-01_oidc_jwks_homolog.md` |
| `S11-02` | `P0` | `3 pts` | Frontend/Auth | `S11-01` | `docs/github_issues/s11-02_sessao_front_back.md` |
| `S11-03` | `P0` | `5 pts` | Backend/Core + Dados | `S11-01` | `docs/github_issues/s11-03_tenant_scope_condominio_id.md` |
| `S11-04` | `P1` | `3 pts` | Backend/Platform + Frontend | `S11-01`, `S11-03` | `docs/github_issues/s11-04_trace_id_end_to_end.md` |
| `S11-05` | `P0` | `3 pts` | QA/Automation + Backend | `S11-01`, `S11-02`, `S11-03`, `S11-04` | `docs/github_issues/s11-05_smoke_seguranca_tenancy.md` |

## Escopo tecnico por card

## `S11-01` OIDC/JWKS real em homolog

Objetivo:
- validar autenticacao corporativa real e tornar o backend pronto para tokens do provedor homolog.

Escopo tecnico sugerido:
- `backend/app/core/config.py`
- `backend/app/core/security.py`
- `backend/app/api/routes.py`
- `.env`
- `docs/sprint3_oidc_homolog_setup.md`

Saidas esperadas:
- validacao de claims realistas;
- mensagens de erro consistentes;
- relatorio de evidencias de autenticacao real.

## `S11-02` Sessao unificada frontend/backend

Objetivo:
- alinhar o ciclo de vida da sessao no cliente com as respostas reais do backend.

Escopo tecnico sugerido:
- `src/features/auth/context/AuthContext.tsx`
- `src/services/authService.ts`
- `src/services/authTokenStore.ts`
- `src/services/authEvents.ts`
- `src/services/http.ts`
- `src/features/auth/pages/LoginPage.tsx`

Saidas esperadas:
- expiracao previsivel;
- limpeza de sessao confiavel;
- UX coerente para `401`, `403` e expiracao.

## `S11-03` Tenant scope end-to-end por `condominio_id`

Objetivo:
- garantir isolamento multi-condominio como contrato obrigatorio de API, repositories e integracoes.

Escopo tecnico sugerido:
- `backend/app/core/security.py`
- `backend/app/api/routes.py`
- `backend/app/api/contracts_module_routes.py`
- `backend/app/api/enel_integration_routes.py`
- `backend/app/api/sabesp_integration_routes.py`
- `backend/app/repositories/`
- `backend/app/integrations/enel/`
- `backend/app/integrations/sabesp/`

Saidas esperadas:
- remocao de pontos com tenant implicito;
- auditoria de tentativa cross-tenant;
- smoke funcional de negacao de acesso.

## `S11-04` `trace_id` ponta a ponta

Objetivo:
- permitir correlacao entre request do usuario, resposta da API e logs operacionais.

Escopo tecnico sugerido:
- `backend/app/main.py`
- `backend/app/utils/logging.py`
- `src/services/http.ts`
- `src/services/apiStatus.ts`
- `src/features/observability/pages/ObservabilityPage.tsx`

Saidas esperadas:
- `trace_id` por request;
- log estruturado correlacionado;
- orientacao operacional de uso.

## `S11-05` Smoke de seguranca e tenancy

Objetivo:
- transformar os ganhos da sprint em gate reproduzivel.

Escopo tecnico sugerido:
- `tests/`
- `backend/tests/`
- `scripts/`
- `docs/`
- configuracao de CI relevante

Saidas esperadas:
- suite reproduzivel;
- relatorio markdown de PASS/FAIL;
- checklist para avancar a Sprint 12.

## Dependencias criticas

- `S11-01` precisa acontecer antes de qualquer fechamento real da sprint.
- `S11-03` deve considerar o que for validado em `S11-01` para nao mascarar tenant em token.
- `S11-05` depende do fechamento minimo dos quatro cards anteriores.

## Critico para o caminho feliz

- Se o IdP real nao estiver disponivel, a sprint perde seu principal criterio de aceite.
- Se existir tenant default escondido em repository ou integracao, o risco de vazamento de dados permanece.
- Sem `trace_id`, a validacao em homolog fica muito mais lenta e fraca.

## Artefatos gerados neste pacote

- `docs/sprint11_execution_board.md`
- `docs/sprint11_cronograma_responsaveis.md`
- `docs/github_issues/s11-01_oidc_jwks_homolog.md`
- `docs/github_issues/s11-02_sessao_front_back.md`
- `docs/github_issues/s11-03_tenant_scope_condominio_id.md`
- `docs/github_issues/s11-04_trace_id_end_to_end.md`
- `docs/github_issues/s11-05_smoke_seguranca_tenancy.md`
