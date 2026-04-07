-- 003_data_quality_tests.sql
-- Queries should return zero rows in healthy dataset.

-- 1) Duplicate primary key candidate in anomalies
select anomalia_id, count(*)
from app.eventos_anomalia
group by anomalia_id
having count(*) > 1;

-- 2) Orphan unit in consumption
select c.unidade_id
from silver.consumo_unidade c
left join app.unidades u on u.unidade_id = c.unidade_id
where u.unidade_id is null;

-- 3) Orphan supplier in fiscal notes
select n.fornecedor_id
from silver.notas_fiscais n
left join app.fornecedores f on f.fornecedor_id = n.fornecedor_id
where f.fornecedor_id is null;

-- 4) Invalid enum normalization
select status_revisao, count(*)
from app.eventos_anomalia
group by status_revisao
having status_revisao not in ('pendente', 'em_revisao', 'resolvido', 'descartado');

-- 5) Invalid unidade_medida domain
select unidade_medida, count(*)
from silver.consumo_unidade
group by unidade_medida
having unidade_medida not in ('kwh', 'm3', 'l', 'amper');

-- 6) Contracts with invalid date ranges
select contrato_id
from app.contratos
where data_vencimento < data_inicio;
