# Sprint 11 - Closing Checklist

Data de referencia: 8 de abril de 2026

Objetivo: consolidar o gate final da Sprint 11 antes de liberar a passagem para a Sprint 12.

## 1. Identidade real em homolog

- [x] Executar validacao estrutural com `npm run env:validate:s11:oidc`.
- [ ] Confirmar `AUTH_PROVIDER=oidc_jwks`.
- [ ] Validar `OIDC_ISSUER`, `OIDC_AUDIENCE` e `OIDC_JWKS_URL`.
- [ ] Confirmar claim de role em `OIDC_ROLE_CLAIM`.
- [ ] Confirmar claim de tenant em `OIDC_TENANT_CLAIM`.
- [ ] Validar token real com roles `admin`, `sindico` e `morador`.
- [ ] Validar `401` para token invalido ou expirado.

## 2. Sessao e navegacao protegida

- [x] Validar expiracao previsivel de sessao no frontend.
- [x] Garantir logout limpo e sem estado residual.
- [x] Confirmar tratamento visual de `401` e `403`.
- [x] Confirmar propagacao de `traceId` em falhas autenticadas.

## 3. Tenant isolation

- [x] Confirmar `condominiumId` obrigatorio nas rotas protegidas.
- [x] Confirmar repositories e integracoes sem tenant implicito.
- [x] Validar cross-tenant ENEL com `404` para o cliente e auditoria interna.
- [x] Validar cross-tenant SABESP com `404` para o cliente e auditoria interna.

## 4. Traceabilidade operacional

- [x] Confirmar header `X-Trace-Id` nas respostas.
- [x] Confirmar `traceId` no payload de erro.
- [x] Confirmar evento estruturado com `traceId` no log de seguranca.
- [x] Confirmar orientacao operacional publicada na tela de Observabilidade.

## 5. Smoke e evidencias

- [x] Script `scripts/security/sprint11-security-tenancy-smoke.ps1` publicado.
- [x] Runbook de execucao publicado.
- [x] Template de relatorio markdown publicado.
- [ ] Rodar smoke com tokens reais de homolog.
- [ ] Anexar relatorio final com `PASS`.
- [ ] Anexar claims mascarados e evidencias de `traceId`.

## 6. Dependencias para Sprint 12

- Disponibilizar credenciais e claims reais do provedor OIDC/JWKS.
- Validar smoke da Sprint 11 em homolog com Oracle acessivel.
- Congelar contrato de autenticacao e tenancy como baseline da proxima sprint.
- Reaproveitar o `traceId` como chave de troubleshooting nos fluxos novos da Sprint 12.

## Encerramento

A Sprint 11 pode ser considerada fechada quando:

- o gate real de OIDC/JWKS estiver validado;
- o smoke completo da sprint retornar `PASS`;
- o pacote de evidencias estiver anexado em `docs/`;
- nao houver fluxo critico com tenant implicito ou sem correlacao por `traceId`.
