# S11-01 - OIDC/JWKS real em homolog

## Contexto

Objetivo da Sprint 11: fechar autenticacao corporativa real para sustentar tenancy, seguranca e go-live controlado.

Card: `S11-01`  
Prioridade: `P0`  
Estimativa: `5 pts`

## Criterio de aceite

- backend valida token real com `issuer`, `audience` e `JWKS` corretos;
- claim de role mapeia perfis validos;
- claim de tenant gera `condominiumId` valido;
- tokens invalidos, expirados ou com claims incorretos retornam erro previsivel.

## Escopo tecnico

- revisar `backend/app/core/config.py` para variaveis e validacoes do provedor;
- revisar `backend/app/core/security.py` para validacao de `JWKS`, claims e erros;
- revisar `backend/app/api/routes.py` para fluxo de login e dependencias relacionadas;
- alinhar `.env` e documentacao de homolog;
- registrar evidencias de token real de forma mascarada.

## Arquivos provaveis

- `backend/app/core/config.py`
- `backend/app/core/security.py`
- `backend/app/api/routes.py`
- `.env`
- `docs/sprint3_oidc_homolog_setup.md`

## Checklist de implementacao

- [x] Publicar gate tecnico de readiness (`npm run env:validate:s11:oidc`).
- [x] Expor pendencias de readiness em `/api/health` e `/api/settings`.
- [ ] Validar `AUTH_PROVIDER=oidc_jwks` no ambiente homolog.
- [ ] Confirmar `OIDC_ISSUER`, `OIDC_AUDIENCE` e `OIDC_JWKS_URL`.
- [ ] Confirmar claims reais de role e tenant com o IdP.
- [ ] Testar token valido, token expirado, token com `audience` incorreta e token com tenant invalido.
- [ ] Garantir logs de seguranca com contexto suficiente para troubleshooting.
- [ ] Registrar evidencias tecnicas no card.

## Evidencias obrigatorias

- [ ] resposta real validando token corporativo;
- [ ] captura mascarada dos claims relevantes;
- [ ] log ou relatorio mostrando falha controlada em token invalido;
- [ ] confirmacao de que segredos ficaram fora do repositorio.

## Dependencias

- IdP homolog acessivel.
- Credenciais ou token real disponibilizados.
- Ambiente homolog com Oracle e API operacionais.

## Definicao de pronto (DoD do card)

- criterio de aceite atendido;
- documentacao minima atualizada;
- evidencias publicadas;
- pronto para destravar `S11-02`, `S11-03` e `S11-05`.
