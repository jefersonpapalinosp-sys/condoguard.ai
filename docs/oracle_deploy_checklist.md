# Oracle Deploy Checklist

## 1) Ambiente e rede

- [ ] Instancia Oracle provisionada (prod/homolog).
- [ ] Porta e rota de rede liberadas para API.
- [ ] TLS e certificados revisados.

## 2) Schemas e grants

- [ ] Schemas/usuarios criados: `APP`, `MART`, `SILVER`, `BRONZE`.
- [ ] `APP` com permissoes DDL/DML nas tabelas de dominio.
- [ ] `MART` com `SELECT` em `APP` e permissao para criar views.
- [ ] Usuario da API com `SELECT` em `MART` e tabelas necessarias.

## 3) DDL e views

- [ ] Executar `npm run db:migrate:flyway` com `ORACLE_*` apontando para o ambiente alvo.
- [ ] Confirmar `flyway_schema_history` com `V001 -> V011`.
- [ ] Validar objetos criados, constraints e indices ativos.
- [ ] Validar views `MART` consumidas pela API:
  - `mart.vw_management_units`
  - `mart.vw_financial_invoices`
  - `mart.vw_alerts_operational`
  - `mart.vw_contracts`

## 4) Qualidade de dados

- [ ] Garantir relatorio versionado em `database/reports/data_quality_report.json`.
- [ ] Executar `npm run db:data-quality:gate`.
- [ ] Se necessario, usar `npm run db:data-quality:gate:warn` apenas para diagnostico.
- [ ] Corrigir qualquer inconsistencia bloqueante antes do go-live.
- [ ] Revisar duplicidades/orfaos com o time de dados.

## 5) API backend

- [ ] Configurar variaveis: `DB_DIALECT=oracle`, `ORACLE_*`.
- [ ] Instalar driver Oracle no ambiente da API: `oracledb`.
- [ ] Rodar `npm run api:dev:oracle` e validar `/api/health`.
- [ ] Confirmar `dbStatus` = `oracle_pool_ok`.

## 6) Observabilidade e resiliencia

- [ ] Logs de erro Oracle centralizados.
- [ ] Alertas para falha de pool/timeout.
- [ ] Monitorar taxa de fallback seed (deve ser 0 em prod).

## 7) Go-live

- [ ] Smoke test endpoints: `/api/invoices`, `/api/management/units`, `/api/alerts`, `/api/chat/bootstrap`.
- [ ] Frontend validado com badge `Fonte: API real`.
- [ ] Plano de rollback definido (retorno para `DB_DIALECT=mock`).
- [ ] Evidencia de Flyway + data quality anexada ao pacote de liberacao.
