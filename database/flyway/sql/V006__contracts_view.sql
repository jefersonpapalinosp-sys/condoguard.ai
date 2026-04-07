-- V006__contracts_view.sql
-- Initial safe fallback view for API /api/contracts (no dependency on APP.CONTRATOS/FORNECEDORES).

create or replace view mart.vw_contracts as
select
  row_number() over (partition by condominio_id order by sum(amount) desc) as contrato_id,
  condominio_id,
  'Fornecedor ' || nvl(regexp_substr(unidade, '^[^-]+'), 'GERAL') as fornecedor,
  'Servico consolidado por bloco' as tipo_servico,
  sum(amount) as valor_mensal,
  'IPCA' as indice_reajuste,
  cast(null as date) as data_inicio,
  cast(null as date) as data_vencimento,
  case
    when sum(case when lower(status) = 'overdue' then 1 else 0 end) > 0 then 'atencao'
    else 'ok'
  end as status_auditoria_ia
from mart.vw_financial_invoices
group by condominio_id, nvl(regexp_substr(unidade, '^[^-]+'), 'GERAL');
