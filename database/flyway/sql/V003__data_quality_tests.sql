-- 003_data_quality_tests_oracle.sql
-- Queries should return zero rows in healthy dataset.

-- 1) Duplicate primary key candidate in anomalies
select anomalia_id, count(*) as total
from app.eventos_anomalia
group by anomalia_id
having count(*) > 1;

-- 2) Orphan unit in consumption
select c.unidade_id
from silver.consumo_unidade c
where not exists (
  select 1
  from app.unidades u
  where u.unidade_id = c.unidade_id
);

-- 3) Orphan supplier in fiscal notes
select n.fornecedor_id
from silver.notas_fiscais n
where not exists (
  select 1
  from app.fornecedores f
  where f.fornecedor_id = n.fornecedor_id
);

-- 4) Invalid enum normalization
select status_revisao, count(*) as total
from app.eventos_anomalia
group by status_revisao
having status_revisao not in ('pendente', 'em_revisao', 'resolvido', 'descartado');

-- 5) Invalid unidade_medida domain
select unidade_medida, count(*) as total
from silver.consumo_unidade
group by unidade_medida
having unidade_medida not in ('kwh', 'm3', 'l', 'amper');

-- 6) Contracts with invalid date ranges
select contrato_id
from app.contratos
where data_vencimento < data_inicio;
