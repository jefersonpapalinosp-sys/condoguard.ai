# S2-03 - Ajustar fallback para seed apenas em dev/hml

## Contexto

Objetivo da Sprint 2: manter comportamento seguro por ambiente sem fechar producao nesta sprint.

Card: `S2-03`  
Prioridade: `P0`  
Estimativa: `3 pts`

## Criterio de aceite

- Ambiente `prod` falha explicitamente se Oracle indisponivel.

## Escopo tecnico

- Controlar fallback por ambiente (`dev`, `hml`, `prod`).
- Permitir fallback seed somente em `dev/hml`.
- Bloquear fallback em `prod` com erro controlado.
- Melhorar logs para diagnostico rapido.

## Checklist de implementacao

- [ ] Definir/validar variavel de ambiente de runtime (`APP_ENV` ou equivalente).
- [ ] Implementar regra de fallback restrita a `dev/hml`.
- [ ] Implementar falha explicita em `prod` quando Oracle indisponivel.
- [ ] Garantir que mensagem de erro nao exponha segredos.
- [ ] Criar teste (ou smoke) para `prod` simulado sem Oracle.
- [ ] Criar teste (ou smoke) para `dev/hml` com fallback ativo.

## Evidencias obrigatorias

- [ ] Log/resposta de erro controlado em `prod`.
- [ ] Log/resposta de fallback funcionando em `dev/hml`.
- [ ] Referencia ao teste automatizado ou roteiro executado.

## Dependencias

- `S2-01` concluido.

## Definicao de pronto (DoD do card)

- Regra por ambiente implementada e validada.
- Criterio de aceite atendido.
- Evidencias anexadas.
