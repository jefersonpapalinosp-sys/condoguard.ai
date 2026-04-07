-- 002_marts_views.sql

create schema if not exists mart;

create or replace view mart.vw_management_units as
select
  u.condominio_id,
  u.unidade_id,
  u.bloco,
  u.numero_unidade,
  coalesce(m.nome, '-') as morador,
  case
    when m.morador_id is null then 'vacant'
    else 'occupied'
  end as status,
  current_timestamp as updated_at
from app.unidades u
left join app.moradores m on m.unidade_id = u.unidade_id;

create or replace view mart.vw_financial_invoices as
select
  f.fatura_id,
  f.condominio_id,
  concat(u.bloco, '-', u.numero_unidade) as unidade,
  coalesce(m.nome, '-') as morador,
  to_char(f.competencia, 'Mon/YYYY') as referencia,
  f.vencimento,
  f.valor_total as amount,
  f.status,
  f.origem_dado
from app.faturas_condominiais f
join app.unidades u on u.unidade_id = f.unidade_id
left join app.moradores m on m.morador_id = f.morador_id;

create or replace view mart.vw_alerts_operational as
select
  e.anomalia_sk as alert_id,
  e.condominio_id,
  e.data_detectada,
  e.tipo_anomalia,
  e.entidade_tipo,
  e.score_anomalia,
  e.gravidade,
  e.status_revisao,
  e.recomendacao_acao,
  e.descricao_anomalia
from app.eventos_anomalia e
where e.status_revisao in ('pendente', 'em_revisao');
