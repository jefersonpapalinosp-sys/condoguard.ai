# S2-05 - Smoke de endpoints principais no Oracle

## Contexto

Objetivo da Sprint 2: validar endpoints core servindo dados via Oracle em homolog.

Card: `S2-05`  
Prioridade: `P0`  
Estimativa: `3 pts`

## Criterio de aceite

- `/api/invoices`, `/api/management/units`, `/api/alerts`, `/api/chat/bootstrap` servindo Oracle.

## Escopo tecnico

- Executar smoke test dos endpoints principais com Oracle ativo.
- Coletar status HTTP, tempo de resposta e origem dos dados.
- Registrar baseline de latencia para comparacao futura.

## Checklist de implementacao

- [ ] Executar smoke em `/api/invoices`.
- [ ] Executar smoke em `/api/management/units`.
- [ ] Executar smoke em `/api/alerts`.
- [ ] Executar smoke em `/api/chat/bootstrap`.
- [ ] Confirmar respostas HTTP 200 e fonte Oracle.
- [ ] Registrar baseline de latencia dos endpoints.
- [ ] Versionar relatorio de smoke em `docs/`.

## Evidencias obrigatorias

- [ ] Relatorio de smoke com endpoints, status e latencia.
- [ ] Evidencia de ambiente homolog com Oracle ativo.
- [ ] Registro de data/hora da execucao.

## Dependencias

- `S2-01` concluido.
- `S2-02` concluido.

## Definicao de pronto (DoD do card)

- Criterio de aceite atendido para todos os endpoints.
- Baseline registrada.
- Evidencias anexadas.
