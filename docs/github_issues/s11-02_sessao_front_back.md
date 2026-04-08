# S11-02 - Sessao unificada frontend/backend

## Contexto

Objetivo da Sprint 11: garantir que a experiencia de sessao no frontend reflita fielmente o comportamento real do backend autenticado por OIDC/JWT.

Card: `S11-02`  
Prioridade: `P0`  
Estimativa: `3 pts`

## Criterio de aceite

- sessao expira de forma previsivel;
- logout limpa estado local e impede acesso a rotas protegidas;
- `401` e `403` recebem tratamento consistente no cliente;
- reload da pagina restaura sessao valida sem corromper o estado.

## Escopo tecnico

- revisar `AuthContext` e ciclo de expiracao;
- revisar `http.ts` para unauthorized, forbidden e resiliencia;
- revisar `authTokenStore` e persistencia de sessao;
- ajustar UX do fluxo de expiracao e retorno ao login.

## Arquivos provaveis

- `src/features/auth/context/AuthContext.tsx`
- `src/services/authService.ts`
- `src/services/authTokenStore.ts`
- `src/services/authEvents.ts`
- `src/services/http.ts`
- `src/features/auth/pages/LoginPage.tsx`

## Checklist de implementacao

- [ ] Validar comportamento de expiracao com token real.
- [ ] Ajustar limpeza de sessao em `401`.
- [ ] Garantir que `403` nao deslogue indevidamente o usuario.
- [ ] Validar restauracao de sessao apos reload.
- [ ] Revisar mensagem/UX para sessao expirada.
- [ ] Registrar evidencias funcionais e tecnicas.

## Evidencias obrigatorias

- [ ] fluxo de login e reload com sessao valida;
- [ ] fluxo de expiracao controlada;
- [ ] fluxo de logout e redirecionamento previsivel;
- [ ] registro do tratamento de `401` e `403`.

## Dependencias

- `S11-01` validado com token e claims reais.

## Definicao de pronto (DoD do card)

- criterio de aceite atendido;
- navegacao protegida consistente;
- regressao minima coberta;
- evidencias anexadas para consumo do QA.
