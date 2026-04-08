# Data Dictionary (Resumo)

## Inventario Flyway atual

| Versao | Tipo | Finalidade |
| --- | --- | --- |
| `V001` | Core schema | entidades transacionais principais em `APP` |
| `V002` | MART | views de leitura para API |
| `V003` | Data quality | validacoes de duplicidade, orfaos e dominios |
| `V004` | Seed controlado | usuarios locais `dev/hml` |
| `V005` | Seed controlado | tenant 2 para smoke cross-tenant |
| `V006` | MART fallback | view inicial de contratos |
| `V007` | Bootstrap | contratos e fornecedores com carga segura |
| `V008` | MART finalize | `vw_contracts` oficial com fallback |
| `V009` | Store modulo | persistencia de Cadastros Gerais |
| `V010` | Integracao | execucoes/itens da integracao ENEL |
| `V011` | Integracao | persistencia Oracle do consumo de agua SABESP |

## Entidades principais

- `dim_condominios`: cadastro mestre de condominios.
- `dim_unidades`: cadastro fisico das unidades.
- `dim_moradores`: relacionamento de ocupacao por unidade.
- `dim_fornecedores`: cadastro de parceiros B2B.
- `contratos`: contratos vigentes por fornecedor/condominio.
- `consumo_unidade`: historico de consumo por unidade.
- `notas_fiscais` e `pagamentos`: trilha financeira de fornecedores.
- `eventos_anomalia`: deteccoes e workflow de revisao.

## Entidades `APP` priorizadas no produto atual

- `app.condominios`: tenant principal e ancora de isolamento.
- `app.unidades`: relacao fisica por condominio.
- `app.moradores`: ocupacao atual e historico basico.
- `app.fornecedores`: base de parceiros/contratos.
- `app.contratos`: contrato operacional consumido por `mart.vw_contracts`.
- `app.faturas_condominiais`: fonte principal de financeiro condominial e integracoes.
- `app.eventos_anomalia`: alertas operacionais e contexto do chat.
- `app.usuarios`: suporte local a autenticacao `dev/hml`.
- `app.integracoes_execucoes`: historico macro das importacoes.
- `app.integracoes_itens`: resultado por item importado.
- `app.consumo_agua_mensal`: consumo de agua mensal importado e operado pela trilha SABESP.

## Contrato de leitura `MART`

- `mart.vw_management_units`
  - consumidores atuais: `management_repo`, `consumption_repo`, `chat_context_service`
  - papel: status operacional de unidades e morador atual.
- `mart.vw_financial_invoices`
  - consumidores atuais: `invoices_repo`, `reports_repo`, `contracts_repo`, `consumption_repo`, `chat_repo`
  - papel: leitura financeira agregada para UI e contexto.
- `mart.vw_alerts_operational`
  - consumidores atuais: `alerts_repo`, `reports_repo`, `consumption_repo`, `chat_repo`
  - papel: alertas pendentes/em revisao usados na operacao.
- `mart.vw_contracts`
  - consumidores atuais: `contracts_repo`
  - papel: lista de contratos com fallback controlado para homolog.

## Excecoes atuais de persistencia

- `alerts`
  - leitura vem de `mart.vw_alerts_operational`
  - estado de leitura ainda usa `backend/data/alerts_reads_state.json`
- `invoices`
  - base vem de `app.faturas_condominiais` + `mart.vw_financial_invoices`
  - overlays de status/update ainda usam arquivos JSON locais
- `contracts management`
  - leitura base pode vir de Oracle
  - overrides, eventos e documentos ainda usam `contracts_management_state.json`
- `integracoes ENEL/SABESP`
  - ENEL ainda mantem runs/snapshots em arquivos JSON por tenant
  - SABESP passa a persistir consumo em `app.consumo_agua_mensal` via Flyway `V011`, mas runs continuam em JSON por tenant
- `security audit`
  - persistencia atual e em arquivo JSONL configuravel
- `chat telemetry`
  - estado atual e somente em memoria

## Campos criticos para produto atual

- `Invoices`:
  - recomendado: `app.faturas_condominiais` (nova tabela)
  - nao recomendado: usar `notas_fiscais` diretamente (escopo B2B)
- `Management`:
  - chave: `dim_unidades.unidade_id`
  - enriquecimento: morador atual + status operacional
- `Chat`:
  - contexto base: `eventos_anomalia`, `contratos`, `consumo_unidade`, `faturas_condominiais`

## Regras de padronizacao

- IDs: `bigint` sem sufixo `.0`.
- Datas: `date` ou `timestamp`, nunca serial Excel.
- Enums em lowercase padronizado.
- Chaves estrangeiras com integridade referencial obrigatoria.
- Views `MART` devem ser tratadas como contrato de leitura da API sempre que existirem.
