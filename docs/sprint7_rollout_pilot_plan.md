# Sprint 7 - Plano de Rollout Piloto (S7-02)

Data de referencia: 6 de abril de 2026

Objetivo: executar piloto controlado em 1-2 condominios antes da expansao.

## Escopo do piloto

- Condominio piloto 1: _preencher_
- Condominio piloto 2 (opcional): _preencher_
- Responsavel tecnico backend: _preencher_
- Responsavel de operacao/negocio: _preencher_

## Janela de rollout

- Inicio planejado: _preencher_
- Fim planejado: _preencher_
- Janela de monitoramento intensivo: primeiras 24h

## Criterios de entrada

1. Gate S7-01 validado com evidencia.
2. Drill S7-03 executado com sucesso.
3. Time de plantao definido para janela do piloto.

## Monitoramento do piloto

- Indicadores obrigatorios:
  - disponibilidade da API (`/api/health`)
  - taxa de erro e p95 em `/api/observability/metrics`
  - incidentes de auth/acesso e feedback de usuarios
- Canal de alerta:
  - _preencher (log/webhook/teams/slack)_

## Criterios de aprovacao para expandir rollout

1. Sem incidente critico aberto na janela.
2. Fluxos criticos funcionando (financeiro, alertas, chat, observabilidade).
3. Time de negocio valida operacao no condominio piloto.

## Criterios de rollback do piloto

1. indisponibilidade continua acima do SLA interno;
2. falha recorrente de autenticacao/autorizacao;
3. erro critico em fluxo financeiro ou alertas sem mitigacao imediata.
