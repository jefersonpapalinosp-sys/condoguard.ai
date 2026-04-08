# Sprint 12 - Data Quality Baseline

Data de referencia: 8 de abril de 2026

## Objetivo

Registrar a baseline atual do gate de qualidade de dados para orientar a limpeza da sprint sem perder rastreabilidade.

## Fonte

- relatorio analisado: `database/reports/data_quality_report.json`
- comando diagnostico: `npm run db:data-quality:gate:warn`
- comando estrito: `npm run db:data-quality:gate`

## Resumo atual

- status do gate: `FAIL`
- grupos bloqueantes: `6`
- ocorrencias afetadas: `164`

## Issues bloqueantes atuais

1. `eventos_anomalia.duplicated_anomalia_id`
   - ocorrencias: `99`
   - preview: `99`
2. `consumo_unidade.unidade_id.orphans`
   - ocorrencias: `1`
   - preview: `404`
3. `notas_fiscais.fornecedor_id.orphans`
   - ocorrencias: `5`
   - preview: `501`, `502`, `503`, `505`, `507`
4. `notas_fiscais.contrato_id.orphans`
   - ocorrencias: `2`
   - preview: `8001`, `8002`
5. `eventos_anomalia.status_revisao.values`
   - ocorrencias invalidas: `55`
   - preview: `Pendente=55`
6. `consumo_unidade.unidade_medida.values`
   - ocorrencias invalidas: `2`
   - preview: `850=2`

## Leitura tecnica

- o gate agora desconsidera valores validos conhecidos em dominios enumerados;
- por isso, `m3=14400` e `pendente=219` nao contam como bloqueio;
- a baseline atual reflete apenas o que realmente foge do contrato esperado.

## Implicacao para a sprint

- o gate ja esta pronto para bloquear o fechamento tecnico;
- o trabalho pendente agora e limpar ou reclassificar os dados de origem;
- enquanto a baseline nao for saneada, a integracao em CI deve ficar em modo diagnostico.

## Proximas acoes sugeridas

1. normalizar `status_revisao` para lowercase canonicamente;
2. corrigir o valor invalido de `unidade_medida`;
3. revisar chaves orfas de `notas_fiscais` e `consumo_unidade`;
4. investigar a origem das duplicidades de `anomalia_id`;
5. promover o gate para modo bloqueante no CI quando a baseline estiver limpa.
