# Sprint 7 - Execution Board (Go-live controlado)

Data de referencia: 6 de abril de 2026

Objetivo da sprint: publicar com risco controlado, plano de resposta e operacao assistida.

## Status resumido

- `S7-01` Homologacao espelhando producao: **nao iniciado**
- `S7-02` Rollout piloto (1-2 condominios): **nao iniciado**
- `S7-03` Runbook e rollback: **nao iniciado**
- `S7-04` Treinamento e handoff operacional: **nao iniciado**

## S7-01 - Homolog espelhando producao

- [ ] Congelar matriz de variaveis por ambiente (`dev/hml/prod`).
- [ ] Validar gate final de identidade real (`S3-01`) em homolog.
- [ ] Validar comportamento sem fallback mock em contexto de producao.
- [ ] Executar regressao dos fluxos criticos (financeiro, alertas, chat, observabilidade).

## S7-02 - Rollout piloto

- [ ] Definir condominio(s) piloto e responsaveis.
- [ ] Definir janela controlada de rollout.
- [ ] Monitorar incidentes durante janela piloto.
- [ ] Registrar criterios de aprovacao para expandir rollout.

## S7-03 - Runbook e rollback

- [ ] Consolidar runbook unico de operacao.
- [ ] Documentar rollback tecnico e de dados.
- [ ] Simular rollback ponta a ponta em ambiente controlado.
- [ ] Registrar tempos de resposta (RTO/RPO praticos).

## S7-04 - Treinamento e handoff

- [ ] Treinar equipe operacional (suporte + negocio).
- [ ] Fechar FAQ operacional e trilha de escalonamento.
- [ ] Entregar pacote final de documentacao assinada.
- [ ] Definir rotina de acompanhamento pos-go-live.

## Critico para Go-live

1. `S3-01` concluido com OIDC real em homolog/producao.
2. CI Quality Gate verde com smoke Oracle.
3. Plano de rollback validado em simulacao.
