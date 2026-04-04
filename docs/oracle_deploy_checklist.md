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

- [ ] Executar `database/sql/oracle/001_core_schema_oracle.sql`.
- [ ] Executar `database/sql/oracle/002_marts_views_oracle.sql`.
- [ ] Validar objetos criados e indices ativos.

## 4) Qualidade de dados

- [ ] Executar `database/sql/oracle/003_data_quality_tests_oracle.sql`.
- [ ] Corrigir qualquer linha retornada antes do go-live.
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
