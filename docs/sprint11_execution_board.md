# Sprint 11 - Execution Board (Identidade real, tenancy e contrato arquitetural)

Data de referencia: 8 de abril de 2026

Objetivo da sprint: fechar os gates tecnicos de autenticacao corporativa, isolamento multi-condominio e rastreabilidade operacional para sustentar as sprints 12 a 18.

## Escopo da sprint

- Validacao de OIDC/JWKS real em homolog.
- Sessao unificada frontend/backend com expiracao previsivel.
- Revisao de tenant scope por `condominio_id` em modulos core e integracoes.
- Propagacao de `trace_id` em request, resposta e logs.
- Smoke de seguranca e tenancy com evidencias de fechamento.

## Fora de escopo

- Go-live produtivo.
- Redesign amplo do shell visual do frontend.
- Novas features de negocio fora dos gates de seguranca e arquitetura.
- Automatizacao completa de provisionamento do provedor de identidade externo.

## Status resumido

- `S11-01` OIDC/JWKS real em homolog: **todo**
- `S11-02` Sessao unificada frontend/backend: **em andamento**
- `S11-03` Tenant scope end-to-end por `condominio_id`: **done tecnico local**
- `S11-04` `trace_id` ponta a ponta: **done tecnico local**
- `S11-05` Smoke de seguranca e tenancy: **em andamento**

## S11-01 - OIDC/JWKS real em homolog

- [x] Publicar gate de readiness de ambiente para OIDC (`npm run env:validate:s11:oidc`).
- [x] Expor diagnostico de readiness OIDC em `health` e `settings`.
- [x] Enriquecer startup e smoke reports com detalhes de `oidcReadiness`.
- [x] Separar perfil local coerente e template versionado de homolog OIDC.
- [ ] Validar configuracoes de `AUTH_PROVIDER=oidc_jwks`, `OIDC_ISSUER`, `OIDC_AUDIENCE`, `OIDC_JWKS_URL`, `OIDC_ROLE_CLAIM` e `OIDC_TENANT_CLAIM`.
- [ ] Confirmar mapeamento do claim de role e tenant com o provedor real.
- [ ] Exercitar login com token real e validar `401` para token invalido/expirado.
- [ ] Revisar mensagens de erro e logs de seguranca para falhas de autenticacao.
- [ ] Documentar pre-condicoes e evidencias operacionais.

DoD:
- Token real validado em homolog.
- Roles `admin`, `sindico` e `morador` reconhecidas corretamente.
- Tenant valido extraido do token sem dependencia de fallback local.

## S11-02 - Sessao unificada frontend/backend

- [x] Revisar `AuthContext`, `authService`, `authTokenStore` e `http.ts` para expiracao, warning e logout previsiveis.
- [x] Garantir comportamento consistente para `401`, `403` e sessao expirada.
- [x] Ajustar UX de expiracao de sessao para telas protegidas.
- [x] Validar restauracao de sessao apos reload com token valido.
- [x] Validar limpeza completa da sessao no logout.

DoD:
- Navegacao protegida reage corretamente a expiracao e `401`.
- Nao existe estado "meio logado" no cliente.
- Regressao de login/logout coberta por testes ou smoke.

## S11-03 - Tenant scope end-to-end por `condominio_id`

- [x] Revisar uso de `require_tenant_scope` nas rotas principais e nas integracoes ENEL/SABESP.
- [x] Revisar repositories e servicos que ainda possam assumir tenant default.
- [x] Garantir auditoria para tentativas cross-tenant.
- [x] Revisar contrato de `condominiumId` em payloads internos, seeds e stores auxiliares.
- [x] Executar smoke cross-tenant em modulos criticos.

DoD:
- Dados de outro condominio nao ficam acessiveis por rota, repository ou integracao.
- Falhas de escopo geram erro auditavel.
- Contrato `condominio_id` fica consistente entre backend e frontend.

## S11-04 - `trace_id` ponta a ponta

- [x] Definir geracao/propagacao de `trace_id` no backend.
- [x] Anexar `trace_id` em respostas de erro e logs estruturados.
- [x] Propagar `trace_id` no cliente para facilitar troubleshooting.
- [x] Exibir ou registrar o identificador em fluxos de observabilidade.
- [x] Documentar como localizar requests por `trace_id`.

DoD:
- Uma request pode ser correlacionada entre cliente, API e log.
- `trace_id` aparece em resposta e trilha operacional.
- Runbook basico de troubleshooting publicado.

## S11-05 - Smoke de seguranca e tenancy

- [x] Criar ou consolidar script de smoke para autenticacao, RBAC, tenant isolation e `trace_id`.
- [x] Validar cenarios `PASS` e `DENY` com evidencia clara.
- [x] Registrar comandos, ambiente, premissas e resultados em relatorio markdown.
- [x] Atualizar checklist de fechamento e dependencias da proxima sprint.
- [ ] Consolidar pacote de evidencias da sprint.

DoD:
- Suite de smoke reproduzivel publicada.
- Evidencias armazenadas em `docs/`.
- Sprint fica apta a servir de gate para Sprint 12.

## Sequencia sugerida (10 dias uteis)

1. Dia 1: preparar ambiente, claims e evidencias de entrada para `S11-01`.
2. Dia 2-3: fechar autenticacao OIDC/JWKS e validacoes negativas.
3. Dia 4: alinhar sessao frontend/backend.
4. Dia 5-6: revisar tenant scope em core e integracoes.
5. Dia 7: implementar `trace_id` e padrao de logging correlacionado.
6. Dia 8-9: rodar smoke de seguranca e tenancy, corrigir gaps.
7. Dia 10: checklist final, evidencias e handoff da Sprint 11.

## Dependencias da sprint

- Credenciais e configuracoes reais do provedor de identidade.
- Ambiente homolog com Oracle acessivel.
- Disponibilidade de token real para cenarios positivos e negativos.

## Riscos e mitigacao

- Risco: claims reais do IdP divergirem do esperado.
  Mitigacao: parametrizar mapeamento por ambiente e documentar contrato.
- Risco: parte do backend ainda depender de tenant default.
  Mitigacao: revisar repositories/stores e adicionar smoke cross-tenant.
- Risco: troubleshooting dificil sem correlacao de logs.
  Mitigacao: priorizar `trace_id` antes do fechamento da sprint.

## Evidencias esperadas

- Relatorio de smoke da sprint.
- Runbook de smoke da sprint.
- Registro do token/claims usados de forma mascarada.
- Checklist de configuracao OIDC em homolog.
- Logs ou respostas demonstrando `trace_id`.

## Criterio de encerramento da Sprint 11

- Identidade real validada com sucesso em homolog.
- Escopo multi-condominio reforcado nos modulos criticos.
- `trace_id` operacional publicado como contrato de troubleshooting.
- Smoke de seguranca e tenancy com resultado PASS e evidencias registradas.
