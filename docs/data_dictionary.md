# Data Dictionary (Resumo)

## Entidades principais

- `dim_condominios`: cadastro mestre de condominios.
- `dim_unidades`: cadastro fisico das unidades.
- `dim_moradores`: relacionamento de ocupacao por unidade.
- `dim_fornecedores`: cadastro de parceiros B2B.
- `contratos`: contratos vigentes por fornecedor/condominio.
- `consumo_unidade`: historico de consumo por unidade.
- `notas_fiscais` e `pagamentos`: trilha financeira de fornecedores.
- `eventos_anomalia`: deteccoes e workflow de revisao.

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
