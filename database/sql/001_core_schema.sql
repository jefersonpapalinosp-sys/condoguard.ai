-- 001_core_schema.sql
-- Postgres target schema (bronze/silver + app tables)

create schema if not exists bronze;
create schema if not exists silver;
create schema if not exists app;

create table if not exists app.condominios (
  condominio_id bigint primary key,
  nome_condominio text not null,
  cnpj varchar(18) not null unique,
  endereco text,
  cidade text not null,
  estado char(2) not null,
  qtd_unidades int not null check (qtd_unidades >= 0),
  data_implantacao date
);

create table if not exists app.unidades (
  unidade_id bigint primary key,
  condominio_id bigint not null references app.condominios(condominio_id),
  bloco varchar(10) not null,
  numero_unidade varchar(10) not null,
  andar int,
  area_m2 numeric(10,2),
  fracao_ideal numeric(10,6),
  tipo_unidade varchar(40) not null,
  qtd_quartos int,
  qtd_vagas_garagem int,
  data_entrega date,
  unique (condominio_id, bloco, numero_unidade)
);

create table if not exists app.moradores (
  morador_id bigint primary key,
  condominio_id bigint not null references app.condominios(condominio_id),
  unidade_id bigint references app.unidades(unidade_id),
  nome text not null,
  tipo_morador varchar(20) not null check (tipo_morador in ('proprietario', 'inquilino')),
  data_inicio_residencia date,
  telefone text,
  email text
);

create table if not exists app.fornecedores (
  fornecedor_id bigint primary key,
  razao_social text not null,
  cnpj varchar(18) not null unique,
  cnae_principal varchar(10),
  data_abertura date,
  status_rfb varchar(20),
  cidade text,
  estado char(2)
);

create table if not exists app.contratos (
  contrato_id bigint primary key,
  condominio_id bigint not null references app.condominios(condominio_id),
  fornecedor_id bigint not null references app.fornecedores(fornecedor_id),
  tipo_servico text not null,
  valor_mensal_vigente numeric(14,2) not null,
  data_inicio date not null,
  data_vencimento date not null,
  indice_reajuste varchar(10) not null check (indice_reajuste in ('IPCA', 'IGPM')),
  sla_horas_mensais numeric(10,2),
  status_auditoria_ia text,
  check (data_vencimento >= data_inicio)
);

create table if not exists app.faturas_condominiais (
  fatura_id bigserial primary key,
  condominio_id bigint not null references app.condominios(condominio_id),
  unidade_id bigint not null references app.unidades(unidade_id),
  morador_id bigint references app.moradores(morador_id),
  competencia date not null,
  vencimento date not null,
  valor_total numeric(14,2) not null check (valor_total >= 0),
  status varchar(15) not null check (status in ('pending', 'paid', 'overdue')),
  data_pagamento timestamp,
  origem_dado varchar(12) not null default 'api' check (origem_dado in ('api', 'mock')),
  created_at timestamp not null default now(),
  updated_at timestamp not null default now(),
  unique (unidade_id, competencia)
);

create index if not exists idx_faturas_condominio_comp on app.faturas_condominiais(condominio_id, competencia);
create index if not exists idx_faturas_status on app.faturas_condominiais(status);

create table if not exists app.eventos_anomalia (
  anomalia_sk bigserial primary key,
  anomalia_id bigint,
  condominio_id bigint not null references app.condominios(condominio_id),
  data_detectada timestamp not null,
  tipo_anomalia text not null,
  entidade_tipo text not null,
  entidade_id bigint,
  fornecedor_id bigint,
  unidade_id bigint,
  gravidade varchar(15) not null check (gravidade in ('baixa', 'media', 'alta', 'critica')),
  score_anomalia numeric(6,4) check (score_anomalia >= 0 and score_anomalia <= 1),
  descricao_anomalia text,
  recomendacao_acao text,
  status_revisao varchar(20) not null check (status_revisao in ('pendente', 'em_revisao', 'resolvido', 'descartado')),
  usuario_revisor text,
  data_revisao timestamp,
  constraint fk_anomalia_fornecedor foreign key (fornecedor_id) references app.fornecedores(fornecedor_id),
  constraint fk_anomalia_unidade foreign key (unidade_id) references app.unidades(unidade_id)
);

create index if not exists idx_anomalia_condominio_data on app.eventos_anomalia(condominio_id, data_detectada desc);
create index if not exists idx_anomalia_status on app.eventos_anomalia(status_revisao);
