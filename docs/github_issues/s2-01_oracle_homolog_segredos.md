# S2-01 - Configurar ambiente Oracle homolog e segredos da API

## Contexto

Objetivo da Sprint 2: conectar API ao Oracle real em homolog com observabilidade minima.

Card: `S2-01`  
Prioridade: `P0`  
Estimativa: `3 pts`

## Criterio de aceite

- `/api/health` retorna `dialect=oracle` e `dbStatus=oracle_pool_ok`.

## Escopo tecnico

- Configurar variaveis de ambiente Oracle em homolog:
  - `ORACLE_USER`
  - `ORACLE_PASSWORD`
  - `ORACLE_CONNECT_STRING`
- Garantir que segredos nao fiquem versionados no repositorio.
- Validar conectividade da API para o Oracle em homolog.
- Executar API com dialeto Oracle e verificar health.

## Checklist de implementacao

- [ ] Definir segredos Oracle no ambiente homolog.
- [ ] Validar conectividade de rede/porta entre API e Oracle.
- [ ] Rodar API com Oracle (`npm run api:dev:oracle` ou pipeline homolog).
- [ ] Validar `/api/health` com `dialect=oracle`.
- [ ] Validar `/api/health` com `dbStatus=oracle_pool_ok`.
- [ ] Registrar evidencias no card.

## Evidencias obrigatorias

- [ ] JSON do endpoint `/api/health` com timestamp.
- [ ] Print/log da inicializacao da API conectada ao Oracle.
- [ ] Confirmacao de que segredos estao apenas no ambiente.

## Dependencias

- Ambiente Oracle homolog disponivel.
- Credenciais validas liberadas pelo time responsavel.

## Definicao de pronto (DoD do card)

- Criterio de aceite atendido.
- Evidencias anexadas.
- Sem segredos no repositorio.
