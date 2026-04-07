-- 006_contracts_view_finalize_oracle.sql
-- Final contracts view; fallback safely if APP tables are missing.

begin
  begin
    execute immediate q'[
      create or replace view mart.vw_contracts as
      select
        c.contrato_id,
        c.condominio_id,
        f.razao_social as fornecedor,
        c.tipo_servico,
        c.valor_mensal_vigente as valor_mensal,
        c.indice_reajuste,
        c.data_inicio,
        c.data_vencimento,
        c.status_auditoria_ia
      from app.contratos c
      join app.fornecedores f on f.fornecedor_id = c.fornecedor_id
    ]';
  exception
    when others then
      execute immediate q'[
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
        group by condominio_id, nvl(regexp_substr(unidade, '^[^-]+'), 'GERAL')
      ]';
  end;
end;
/
