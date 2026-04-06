# Sprint 7 - Execution Board (Go-live controlado)

Data de referencia: 6 de abril de 2026

Objetivo da sprint: publicar com risco controlado, plano de resposta e operacao assistida.

## Status resumido

- `S7-01` Homologacao espelhando producao: **em andamento**
- `S7-02` Rollout piloto (1-2 condominios): **em planejamento**
- `S7-03` Runbook e rollback: **em andamento**
- `S7-04` Treinamento e handoff operacional: **em planejamento**

## S7-01 - Homolog espelhando producao

- [x] Congelar matriz de variaveis por ambiente (`dev/hml/prod`) em `docs/environment_matrix_s7.md`.
- [x] Adicionar validador automatico de perfil de ambiente (`npm run env:validate`).
- [x] Criar smoke automatizado dos fluxos criticos para gate S7-01 (`npm run release:s7:hml-smoke`).
- [x] Criar gate unificado OIDC para fechamento `S3-01` + `S7-01` (`npm run security:smoke:s3:s7:oidc-gate`).
- [x] Executar smoke tecnico em homolog Oracle com `failed=0` (evidencia em `docs/sprint7_hml_smoke_report.md`).
- [ ] Validar gate final de identidade real (`S3-01`) em homolog.
- [ ] Validar comportamento sem fallback mock em contexto de producao.
- [ ] Executar regressao dos fluxos criticos (financeiro, alertas, chat, observabilidade).

## S7-02 - Rollout piloto

- [x] Definir plano de condominio(s) piloto, responsaveis e janela (template operacional em `docs/sprint7_rollout_pilot_plan.md`).
- [ ] Monitorar incidentes durante janela piloto.
- [ ] Registrar criterios de aprovacao para expandir rollout.

## S7-03 - Runbook e rollback

- [x] Consolidar runbook unico de operacao (`docs/sprint7_go_live_runbook.md`).
- [x] Documentar rollback tecnico e de dados (`docs/sprint7_rollback_runbook.md`).
- [x] Criar script de drill de rollback com geracao de relatorio (`npm run release:s7:rollback-drill`).
- [x] Simulacao tecnica local do drill executada com `recovery_failed=0` (evidencia em `docs/sprint7_rollback_drill_report.md`).
- [ ] Registrar tempos de resposta (RTO/RPO praticos) com evidencia no relatorio.
  - RTO local registrado: `2s`
  - RPO: pendente de preenchimento com criterio operacional do ambiente alvo

## S7-04 - Treinamento e handoff

- [x] Publicar plano inicial de treinamento e handoff (`docs/sprint7_training_handoff_plan.md`).
- [ ] Treinar equipe operacional (suporte + negocio).
- [x] Fechar FAQ operacional e trilha de escalonamento base (`docs/sprint7_operational_faq.md`).
- [ ] Entregar pacote final de documentacao assinada.
- [ ] Definir rotina de acompanhamento pos-go-live.

## Critico para Go-live

1. `S3-01` concluido com OIDC real em homolog/producao.
2. CI Quality Gate verde com smoke Oracle.
3. Plano de rollback validado em simulacao.

## Evidencias registradas (06-APR-2026)

- `docs/sprint7_hml_smoke_report.md`:
  - Summary: `total=6`, `failed=0`
  - Health: `env=hml`, `dialect=oracle`, `dbStatus=oracle_pool_ok`
- `docs/sprint7_rollback_drill_report.md`:
  - Summary: `baseline_failed=0`, `recovery_failed=0`
  - RTO observado: `2s`
