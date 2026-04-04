# S2-04 - Health detalhado (pool, latencia, erro resumido)

## Contexto

Objetivo da Sprint 2: ampliar observabilidade minima para operacao Oracle em homolog.

Card: `S2-04`  
Prioridade: `P1`  
Estimativa: `3 pts`

## Criterio de aceite

- Endpoint de health ampliado com indicadores de conectividade.

## Escopo tecnico

- Expandir payload de `/api/health` com:
  - status do pool;
  - latencia de verificacao;
  - erro resumido (quando houver), sem segredos.
- Manter compatibilidade com consumo atual do frontend/monitoramento.

## Checklist de implementacao

- [ ] Incluir indicador de status do pool no health.
- [ ] Incluir latencia de conectividade Oracle.
- [ ] Incluir campo de erro resumido sem stacktrace sensivel.
- [ ] Validar payload em cenarios sucesso e falha.
- [ ] Atualizar documentacao do endpoint.
- [ ] Verificar que nao houve quebra de consumidores.

## Evidencias obrigatorias

- [ ] Exemplo de resposta de health em sucesso.
- [ ] Exemplo de resposta de health em falha controlada.
- [ ] Link/trecho da documentacao atualizada.

## Dependencias

- `S2-01` concluido.

## Definicao de pronto (DoD do card)

- Criterio de aceite atendido.
- Compatibilidade mantida.
- Evidencias anexadas.
