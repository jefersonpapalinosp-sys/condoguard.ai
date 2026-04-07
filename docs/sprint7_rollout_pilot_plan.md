# Sprint 7 - Plano de Rollout Piloto (S7-02)

Data de referencia: 6 de abril de 2026

Objetivo: executar piloto controlado em 1-2 condominios antes da expansao.

Status do plano: **planejado (execucao bloqueada ate gates tecnicos)**

## Escopo do piloto (preenchimento rapido)

- Condominio piloto 1: `____________________________`
- Condominio piloto 2 (opcional): `____________________________`
- Responsavel tecnico backend: `____________________________`
- Responsavel de operacao/negocio: `____________________________`
- Responsavel suporte/on-call: `____________________________`

## Janela de rollout (planejada)

- Inicio planejado: `____/____/________ ____:____`
- Fim planejado: `____/____/________ ____:____`
- Janela de monitoramento intensivo: primeiras 24h
- Janela de congelamento de mudancas: `____h` antes do inicio

## Checklist de entrada (Go para iniciar piloto)

- [ ] Gate S7-01 validado com evidencia (`docs/sprint7_hml_smoke_report.md`).
- [ ] Gate OIDC final (`S3-01`) validado com evidencia.
- [ ] Drill S7-03 executado com sucesso (`docs/sprint7_rollback_drill_report.md`).
- [ ] Time de plantao definido para a janela.
- [ ] Canal de comunicacao de incidente testado.

## Monitoramento do piloto

- Indicadores obrigatorios:
  - disponibilidade da API (`/api/health`)
  - taxa de erro e p95 em `/api/observability/metrics`
  - incidentes de auth/acesso e feedback de usuarios
- Canal de alerta:
  - `____________________________` (log/webhook/teams/slack)

## Matriz de responsabilidades (RACI simplificado)

- Aprovar inicio do piloto: `____________________________`
- Executar deploy/control plane: `____________________________`
- Monitorar saude e incidentes: `____________________________`
- Comunicar negocio e condominio piloto: `____________________________`
- Decisao de rollback: `____________________________`

## Criterios de aprovacao para expandir rollout

1. Sem incidente critico aberto na janela.
2. Fluxos criticos funcionando (financeiro, alertas, chat, observabilidade).
3. Time de negocio valida operacao no condominio piloto.
4. RTO/RPO observados dentro do aceitavel do projeto.

## Criterios de rollback do piloto

1. indisponibilidade continua acima do SLA interno;
2. falha recorrente de autenticacao/autorizacao;
3. erro critico em fluxo financeiro ou alertas sem mitigacao imediata.

## Evidencias para fechamento do S7-02

- [ ] Registro da janela executada (inicio/fim).
- [ ] Registro de incidentes (mesmo quando zero).
- [ ] Validacao de negocio dos condominios piloto.
- [ ] Decisao final: expandir rollout ou manter piloto.
