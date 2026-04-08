# Sprint 12 - Core Entities Gap Analysis

Data de referencia: 8 de abril de 2026

## Objetivo

Registrar o estado atual das entidades core e destacar os gaps entre o schema Flyway, a persistencia efetivamente usada pelo backend e o contrato esperado para as proximas sprints.

## Resumo executivo

O repositorio ja possui uma base Oracle funcional para dominios centrais, mas ainda convive com tres classes de gap estrutural:

1. persistencia hibrida entre Oracle, arquivo JSON e estado em memoria;
2. inconsistencias de modelagem e naming entre tabelas (`condominio_id` vs `condominium_id`);
3. contratos Flyway publicados, mas ainda nao consumidos integralmente pelo runtime.

## Matriz de dominios

| Dominio | Persistencia principal hoje | Runtime atual | Gap principal | Prioridade |
| --- | --- | --- | --- | --- |
| Auth | `app.usuarios` | Oracle + demo auth opcional | coluna usa `condominium_id`, fora do padrao `condominio_id` | `P0` |
| Invoices | `app.faturas_condominiais` + `mart.vw_financial_invoices` | Oracle para leitura/escrita base | overlays de update/status ainda ficam em JSON | `P0` |
| Alerts | `app.eventos_anomalia` + `mart.vw_alerts_operational` | Oracle para leitura | estado de leitura (`read`) fica em JSON | `P1` |
| Cadastros | `cadastros_gerais` | Oracle para CRUD basico | tabela e queries sem prefixo `app.` | `P1` |
| Contracts list | `app.contratos`, `app.fornecedores`, `mart.vw_contracts` | Oracle | fallback de `vw_contracts` ainda relevante em homolog | `P1` |
| Contracts management | seed + `contracts_management_state.json` | Hibrido | documentos, eventos, renovacao e overrides ainda fora do Oracle | `P0` |
| ENEL | `app.faturas_condominiais` + JSON state | Hibrido | `app.integracoes_execucoes`/`itens` existem no Flyway, mas runtime grava runs em JSON | `P0` |
| SABESP | `app.consumo_agua_mensal` + JSON state | Hibrido em transicao | consumo passa a ser versionado via `V011`, mas runs e snapshots auxiliares ainda ficam em JSON | `P0` |
| Security audit | arquivo JSONL | arquivo local | sem tabela/versionamento Oracle para auditoria persistida | `P1` |
| Chat telemetry | estado em memoria | memoria | perde historico ao reiniciar a API | `P2` |

## Gaps confirmados por dominio

## 1. Auth e tenancy

- `app.usuarios` foi criada em `V004`, mas usa a coluna `condominium_id`.
- o restante do modelo Oracle usa `condominio_id`.
- o backend tolera isso porque `auth_repo` consulta explicitamente `condominium_id`, mas o contrato de dados fica inconsistente.

Impacto:
- aumenta custo de manutencao do modelo multi-tenant;
- dificulta padronizacao de seeds, views e futuras migracoes.

## 2. Invoices

- leitura base esta correta via `mart.vw_financial_invoices`;
- criacao e update base usam `app.faturas_condominiais`;
- status de pagamento e patches de edicao ainda sao persistidos em:
  - `backend/data/invoices_status_state.json`
  - `backend/data/invoices_updates_state.json`

Impacto:
- comportamento final da tela depende de overlay fora do banco;
- dificulta auditoria e reprocessamento entre ambientes.

## 3. Alerts

- leitura operacional usa `mart.vw_alerts_operational`;
- a acao `mark_alert_as_read` grava o estado em `backend/data/alerts_reads_state.json`.

Impacto:
- estado de leitura nao acompanha o banco;
- usuario pode perder consistencia entre ambientes/instancias.

## 4. Cadastros Gerais

- `V009` cria `cadastros_gerais`, mas sem prefixo `app.` na DDL;
- `cadastros_repo` tambem consulta a tabela sem schema.

Impacto:
- runtime depende do schema default do usuario Oracle;
- foge do padrao `APP.*` adotado no restante da base.

## 5. Contracts management

- leitura base pode usar Oracle para contratos;
- no entanto, overrides, documentos, eventos e sequenciamento ficam em `backend/data/contracts_management_state.json`.

Impacto:
- modulo de gestao de contratos ainda nao esta totalmente Oracle-first;
- anexos/eventos/renovacoes nao possuem modelo versionado.

## 6. Integracoes ENEL

- `V010` criou `app.integracoes_execucoes` e `app.integracoes_itens`;
- o runtime atual continua armazenando:
  - runs
  - snapshots importados
  - detalhes dos itens
  em `backend/data/enel_integration_state.json`.

Impacto:
- ha tabela Flyway pronta, mas o fluxo operacional ainda nao consome esse contrato;
- listagem/detalhe de runs continuam fora do banco.

## 7. Integracoes SABESP

- `V011` cria `app.consumo_agua_mensal` para consumo de agua mensal com dedupe por chave de negocio/hash;
- o runtime pode persistir consumo SABESP em Oracle e reler esses registros para a rota de consumo;
- runs e snapshots auxiliares continuam em `backend/data/sabesp_integration_state.json`.

Impacto:
- o maior gap estrutural da SABESP deixa de ser a tabela ausente;
- a pendencia remanescente fica concentrada na trilha de execucao/historico ainda fora do Oracle.

## 8. Security audit

- a trilha persistida usa arquivo configuravel (`logs/security-audit.log`);
- consulta administrativa le esse arquivo, nao uma tabela Oracle.

Impacto:
- bom para bootstrap rapido, fraco para governanca de longo prazo;
- dificulta retencao, consulta analitica e padronizacao com o restante do modelo.

## 9. Chat telemetry

- o snapshot de telemetria do chat e mantido apenas em memoria.

Impacto:
- reinicio da API zera a serie;
- observabilidade funcional existe, mas sem historico persistente.

## Recomendacao de migracoes candidatas

## Prioridade `P0`

1. `V012__integration_runs_unified.sql`
   - adaptar o runtime ENEL/SABESP para usar `app.integracoes_execucoes` e `app.integracoes_itens`
   - remover dependencia de `*_integration_state.json` para runs e itens
2. `V013__contracts_management_tables.sql`
   - contratos override, eventos, documentos e timeline do modulo de gestao
3. `V014__invoice_and_alert_ui_state.sql`
   - persistir status de fatura, marcacao de alerta lido e possiveis overrides operacionais

## Prioridade `P1`

5. `V015__auth_schema_normalization.sql`
   - normalizar `app.usuarios.condominium_id` para `condominio_id`
   - manter compatibilidade de leitura durante transicao
6. `V016__cadastros_schema_alignment.sql`
   - qualificar `cadastros_gerais` sob `app.`
   - alinhar grants e queries do repository
7. `V017__security_audit_tables.sql`
   - opcional para mover auditoria persistida para Oracle

## Prioridade `P2`

8. `V018__chat_telemetry_tables.sql`
   - persistencia historica de telemetria do chat se o produto confirmar esse requisito

## Ordem recomendada para a Sprint 13

1. unificar runs de integracao ENEL/SABESP em Oracle (`V012`)
2. trazer contracts management para persistencia versionada (`V013`)
3. fechar overlays de invoices/alerts (`V014`)
4. normalizar auth/cadastros para remover divergencias de schema ainda abertas

## Conclusao

O schema Flyway ja sustenta boa parte do produto, mas a operacao ainda nao esta 100% Oracle-first.

O maior risco atual nao esta na leitura dos modulos principais, e sim nas camadas de estado auxiliar:
- integracoes
- overlays operacionais
- auditoria e telemetria

Esses gaps ja estao claros o bastante para orientar a proxima leva de migracoes sem precisar reabrir a discussao arquitetural do zero.
