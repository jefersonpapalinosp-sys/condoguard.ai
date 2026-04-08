-- V012__integration_runs_unified.sql
-- Sprint 13: unificar trilha de execucao ENEL e SABESP sob app.integracoes_execucoes.
-- Adiciona coluna opcional consumption_id em integracoes_itens para linkar itens SABESP
-- ao registro em consumo_agua_mensal, e cria indices de suporte para listagem por provider.

alter table app.integracoes_itens add (
  consumption_id number(19,0)
);

alter table app.integracoes_itens add constraint fk_integr_item_consumption
  foreign key (consumption_id) references app.consumo_agua_mensal(consumo_agua_id);

create index app.idx_integr_exec_provider on app.integracoes_execucoes(condominio_id, provider, started_at desc);
create index app.idx_integr_item_consumption on app.integracoes_itens(consumption_id);
