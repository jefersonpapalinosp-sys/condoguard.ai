# Sprint 9 - Execution Board (Integracao de Faturas de Concessionaria)

Data de referencia: 6 de abril de 2026

Objetivo da sprint: definir e implementar o MVP recomendado para ingestao de faturas de concessionaria (ENEL) no CondoGuard com confiabilidade, auditabilidade e seguranca.

## Escopo da sprint

- Analise tecnica formal da integracao.
- Desenho do fluxo operacional recomendado (assistido).
- Base de dados para trilha de execucao e itens importados.
- Endpoint backend para disparo e acompanhamento de runs.
- Integracao inicial com modulo de faturas existente.

## Fora de escopo

- Bypass de CAPTCHA/GOV.BR.
- Automacao total nao assistida em producao.
- Dependencia de parceria oficial externa nesta sprint.

## Status resumido

- `S9-01` Analise tecnica e desenho da solucao: **todo**
- `S9-02` Modelo de dados e migracoes Oracle: **todo**
- `S9-03` Orquestrador backend da integracao (MVP assistido): **todo**
- `S9-04` Endpoints de operacao e historico de runs: **todo**
- `S9-05` Observabilidade, seguranca e governanca: **todo**
- `S9-06` Testes, smoke e evidencias finais: **todo**

## S9-01 - Analise tecnica e desenho da solucao

- [ ] Consolidar analise tecnica do script de origem e riscos.
- [ ] Definir arquitetura alvo da integracao ENEL (modulos, contratos, limites).
- [ ] Definir fluxo MVP assistido sem automacao anti-CAPTCHA.
- [ ] Definir requisitos de seguranca e compliance.

DoD:
- Documento tecnico publicado e revisado.
- Decisao de abordagem registrada (assistido primeiro).

## S9-02 - Modelo de dados e migracoes Oracle

- [ ] Criar tabela de execucoes de integracao (`run_id`, `status`, `started_at`, `finished_at`, `error_summary`, `tenant`).
- [ ] Criar tabela de itens processados (dedupe, referencia, vencimento, valor, resultado).
- [ ] Evoluir constraints/regras de `origem_dado` para rastrear `integration_enel`.
- [ ] Versionar migracoes Flyway com rollback documentado.

DoD:
- Migracoes aplicadas localmente com sucesso.
- Modelo preparado para auditoria e reprocessamento.

## S9-03 - Orquestrador backend da integracao (MVP assistido)

- [ ] Criar modulo `backend/app/integrations/enel/` com `orchestrator`, `parser`, `repository`.
- [ ] Implementar fluxo manual/assistido para importar faturas.
- [ ] Implementar dedupe por chave de negocio + hash externo.
- [ ] Persistir faturas validas em `app.faturas_condominiais`.

DoD:
- Run manual cria/atualiza faturas sem duplicidade.
- Erros de item sao registrados por run sem derrubar lote inteiro.

## S9-04 - Endpoints de operacao e historico de runs

- [ ] `POST /api/integrations/enel/runs` (disparo manual).
- [ ] `GET /api/integrations/enel/runs` (listagem com pagina/filtros).
- [ ] `GET /api/integrations/enel/runs/{runId}` (detalhes e itens).
- [ ] Guardar RBAC para perfil administrativo (`admin`/`sindico` conforme politica).

DoD:
- Operacao de run disponivel por API.
- Historico consultavel e consistente com dados de execucao.

## S9-05 - Observabilidade, seguranca e governanca

- [ ] Log estruturado com `run_id`, `tenant_id`, `source`.
- [ ] Metricas de run (`total`, `imported`, `skipped`, `failed`, `duration_ms`).
- [ ] Segredos via variaveis de ambiente (sem hardcode de credenciais).
- [ ] Alertas para falha consecutiva de integracao.

DoD:
- Integracao observavel e auditavel fim a fim.
- Nenhum segredo sensivel exposto em logs ou codigo.

## S9-06 - Testes, smoke e evidencias finais

- [ ] Testes unitarios do parser e dedupe.
- [ ] Testes de contrato dos novos endpoints.
- [ ] Smoke de run manual em ambiente local Oracle.
- [ ] Relatorio final da sprint com evidencias e riscos remanescentes.

DoD:
- Suites verdes nos escopos alterados.
- Evidencias publicadas em `docs/`.

## Sequencia sugerida (10 dias uteis)

1. Dia 1-2: `S9-01` analise e desenho detalhado.
2. Dia 3-4: `S9-02` modelo de dados + migracoes.
3. Dia 5-6: `S9-03` orquestrador e importador assistido.
4. Dia 7: `S9-04` endpoints operacionais.
5. Dia 8: `S9-05` observabilidade e seguranca.
6. Dia 9-10: `S9-06` regressao, smoke e fechamento.

## Riscos e mitigacao da sprint

- Risco: dependencia de fluxo web com CAPTCHA.
  Mitigacao: manter MVP assistido, sem bypass.
- Risco: variacao de layout/fonte de dados externa.
  Mitigacao: camada de parser isolada e versionada.
- Risco: duplicidade ou conflito de faturas.
  Mitigacao: dedupe transacional e rastreio por item.

## Criterio de encerramento da Sprint 9

- MVP assistido da integracao executa com trilha de auditoria.
- Dados importados aparecem no modulo de faturas sem quebrar fluxos atuais.
- Board e relatorio final com comandos, saidas e status PASS/FAIL.
