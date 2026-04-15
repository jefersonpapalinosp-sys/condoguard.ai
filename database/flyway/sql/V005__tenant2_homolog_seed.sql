-- 005_tenant2_homolog_seed.sql
-- Seed minimo para validacao cross-tenant em homolog Oracle (Sprint 3).

insert into app.condominios (condominio_id, nome_condominio, cnpj, endereco, cidade, estado, qtd_unidades, data_implantacao)
select 2, 'Condominio Reserva das Flores', '12.345.678/0002-99', 'Rua das Flores, 100', 'Sao Paulo', 'SP', 2, date '2021-01-15'
from dual
where not exists (select 1 from app.condominios c where c.condominio_id = 2);

insert into app.unidades (unidade_id, condominio_id, bloco, numero_unidade, andar, area_m2, fracao_ideal, tipo_unidade, qtd_quartos, qtd_vagas_garagem, data_entrega)
select 2001, 2, 'B', '201', 2, 67.5, 0.012300, 'apartamento', 2, 1, date '2021-02-01'
from dual
where not exists (select 1 from app.unidades u where u.unidade_id = 2001);

insert into app.unidades (unidade_id, condominio_id, bloco, numero_unidade, andar, area_m2, fracao_ideal, tipo_unidade, qtd_quartos, qtd_vagas_garagem, data_entrega)
select 2002, 2, 'B', '202', 2, 72.0, 0.013200, 'apartamento', 3, 1, date '2021-02-01'
from dual
where not exists (select 1 from app.unidades u where u.unidade_id = 2002);

insert into app.moradores (morador_id, condominio_id, unidade_id, nome, tipo_morador, data_inicio_residencia, telefone, email)
select 2001, 2, 2001, 'Marina Costa', 'proprietario', date '2021-03-01', '11988887777', 'marina.costa@plataforma.dev'
from dual
where not exists (select 1 from app.moradores m where m.morador_id = 2001);

insert into app.moradores (morador_id, condominio_id, unidade_id, nome, tipo_morador, data_inicio_residencia, telefone, email)
select 2002, 2, 2002, 'Bruno Melo', 'inquilino', date '2022-06-10', '11999996666', 'bruno.melo@plataforma.dev'
from dual
where not exists (select 1 from app.moradores m where m.morador_id = 2002);

insert into app.faturas_condominiais (condominio_id, unidade_id, morador_id, competencia, vencimento, valor_total, status, origem_dado)
select 2, 2001, 2001, date '2026-03-01', date '2026-03-10', 920.00, 'overdue', 'api'
from dual
where not exists (
  select 1
  from app.faturas_condominiais f
  where f.unidade_id = 2001
    and f.competencia = date '2026-03-01'
);

insert into app.faturas_condominiais (condominio_id, unidade_id, morador_id, competencia, vencimento, valor_total, status, origem_dado)
select 2, 2002, 2002, date '2026-03-01', date '2026-03-10', 980.00, 'pending', 'api'
from dual
where not exists (
  select 1
  from app.faturas_condominiais f
  where f.unidade_id = 2002
    and f.competencia = date '2026-03-01'
);

insert into app.eventos_anomalia (anomalia_id, condominio_id, data_detectada, tipo_anomalia, entidade_tipo, entidade_id, unidade_id, gravidade, score_anomalia, descricao_anomalia, recomendacao_acao, status_revisao)
select 92001, 2, systimestamp - interval '2' hour, 'consumo_agua_acima_media', 'unidade', 2001, 2001, 'critica', 0.94, 'Consumo muito acima da media historica.', 'Inspecionar vazamento e validar hidrimetro.', 'pendente'
from dual
where not exists (
  select 1
  from app.eventos_anomalia e
  where e.anomalia_id = 92001
    and e.condominio_id = 2
);

insert into app.usuarios (condominium_id, email, password_hash, role, active)
select 2, 'admin.cond2@plataforma.dev', standard_hash('password123', 'SHA256'), 'admin', 1
from dual
where not exists (select 1 from app.usuarios u where lower(u.email) = 'admin.cond2@plataforma.dev');

insert into app.usuarios (condominium_id, email, password_hash, role, active)
select 2, 'sindico.cond2@plataforma.dev', standard_hash('password123', 'SHA256'), 'sindico', 1
from dual
where not exists (select 1 from app.usuarios u where lower(u.email) = 'sindico.cond2@plataforma.dev');

insert into app.usuarios (condominium_id, email, password_hash, role, active)
select 2, 'morador.cond2@plataforma.dev', standard_hash('password123', 'SHA256'), 'morador', 1
from dual
where not exists (select 1 from app.usuarios u where lower(u.email) = 'morador.cond2@plataforma.dev');
