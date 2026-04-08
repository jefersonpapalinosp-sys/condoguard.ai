# S11-04 - `trace_id` ponta a ponta

## Contexto

Objetivo da Sprint 11: tornar troubleshooting e observabilidade mais confiaveis antes das proximas fases de integracao e go-live.

Card: `S11-04`  
Prioridade: `P1`  
Estimativa: `3 pts`

## Criterio de aceite

- cada request gera ou propaga `trace_id`;
- `trace_id` aparece em logs estruturados;
- respostas de erro ou sinais operacionais permitem correlacao;
- o time sabe localizar uma request especifica por identificador.

## Escopo tecnico

- definir estrategia de geracao/propagacao de `trace_id`;
- ajustar logging estruturado;
- revisar cliente para capturar ou exibir o identificador;
- documentar uso operacional.

## Arquivos provaveis

- `backend/app/main.py`
- `backend/app/utils/logging.py`
- `src/services/http.ts`
- `src/services/apiStatus.ts`
- `src/features/observability/pages/ObservabilityPage.tsx`

## Checklist de implementacao

- [ ] Definir formato do `trace_id`.
- [ ] Implementar geracao/propagacao no backend.
- [ ] Adicionar `trace_id` em logs estruturados.
- [ ] Expor o identificador em resposta ou camada de observabilidade.
- [ ] Registrar instrucoes de troubleshooting.

## Evidencias obrigatorias

- [ ] exemplo de request com `trace_id`;
- [ ] exemplo de log correlacionado;
- [ ] exemplo de resposta contendo ou referenciando o identificador;
- [ ] runbook curto de consulta.

## Dependencias

- `S11-01` e `S11-03` preferencialmente fechados para validar o caminho real.

## Definicao de pronto (DoD do card)

- criterio de aceite atendido;
- `trace_id` utilizavel pelo time operacional;
- evidencias prontas para anexar no smoke e na observabilidade.
