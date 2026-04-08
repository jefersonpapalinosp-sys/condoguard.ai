# Sprint 12 - Closing Checklist

Data de referencia: 8 de abril de 2026

## Objetivo

Consolidar as evidencias e os gates da Sprint 12 em um unico ponto de fechamento.

## 1) Flyway e bootstrap

- [ ] `docs/flyway_homolog_runbook.md` revisado e aceito como fonte operacional.
- [ ] Trilha `V001 -> V011` validada como baseline oficial.
- [ ] Auditoria de legado revisada em `docs/sprint12_flyway_legacy_audit.md`.
- [ ] Decisao registrada sobre manter ou arquivar `database/sql` e `database/sql/oracle`.

## 2) Contrato de dados

- [ ] `docs/data_dictionary.md` atualizado com entidades `APP` e views `MART`.
- [ ] `docs/sprint12_core_entities_gap_analysis.md` revisado pelo time tecnico.
- [ ] Gaps `P0` priorizados para Sprint 13.

## 3) Data quality

- [ ] Baseline atual registrada em `docs/sprint12_data_quality_baseline.md`.
- [ ] `npm run db:data-quality:gate:warn` executado e anexado ao pacote da sprint.
- [ ] `npm run db:data-quality:gate` promovido para `PASS` ou mantido com plano formal de saneamento.
- [ ] Decisao registrada sobre quando mover o CI de `warn-only` para bloqueante.

## 4) CI e operacao

- [ ] Workflow `.github/workflows/ci-quality.yml` publicando baseline de qualidade.
- [ ] Checklist Oracle alinhado ao fluxo Flyway e ao gate de qualidade.
- [ ] `README.md` e `docs/oracle_setup.md` consistentes com o uso de `.env`.

## 5) Evidencias finais

- [ ] Board da sprint sincronizado.
- [ ] `docs/sprints_status_master.md` sincronizado.
- [ ] Issues `S12-01` a `S12-05` atualizadas com status real.
- [ ] Handoff pronto para Sprint 13.
