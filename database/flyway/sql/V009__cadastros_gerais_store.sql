-- V009__cadastros_gerais_store.sql
-- Persistent store for Cadastros Gerais module.

declare
  l_count number;
begin
  begin
    execute immediate q'[
      create table cadastros_gerais (
        cadastro_id varchar2(64) primary key,
        condominio_id number(19,0) not null,
        tipo varchar2(20) not null,
        titulo varchar2(120) not null,
        descricao varchar2(240) not null,
        status varchar2(20) not null,
        created_at timestamp default systimestamp not null,
        updated_at timestamp default systimestamp not null,
        constraint ck_cadastros_gerais_tipo
          check (tipo in ('unidade', 'morador', 'fornecedor', 'servico')),
        constraint ck_cadastros_gerais_status
          check (status in ('active', 'pending', 'inactive'))
      )
    ]';
  exception
    when others then
      if sqlcode != -955 then
        raise;
      end if;
  end;

  begin
    execute immediate q'[
      create index idx_cadastros_gerais_condominio
      on cadastros_gerais(condominio_id, updated_at)
    ]';
  exception
    when others then
      if sqlcode != -955 then
        raise;
      end if;
  end;

  execute immediate 'select count(1) from cadastros_gerais' into l_count;
  if l_count = 0 then
    execute immediate q'[
      insert into cadastros_gerais (cadastro_id, condominio_id, tipo, titulo, descricao, status, created_at, updated_at)
      values ('cad-001', 1, 'unidade', 'Unidade A-101', 'Responsavel: Maria Silva', 'active', systimestamp, to_timestamp_tz('2026-04-05T09:22:00.000Z', 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"'))
    ]';
    execute immediate q'[
      insert into cadastros_gerais (cadastro_id, condominio_id, tipo, titulo, descricao, status, created_at, updated_at)
      values ('cad-002', 1, 'morador', 'Carlos Souza', 'Unidade B-204', 'active', systimestamp, to_timestamp_tz('2026-04-05T08:41:00.000Z', 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"'))
    ]';
    execute immediate q'[
      insert into cadastros_gerais (cadastro_id, condominio_id, tipo, titulo, descricao, status, created_at, updated_at)
      values ('cad-003', 1, 'fornecedor', 'Elevadores Prime LTDA', 'Contrato de manutencao preventiva', 'pending', systimestamp, to_timestamp_tz('2026-04-04T17:10:00.000Z', 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"'))
    ]';
    execute immediate q'[
      insert into cadastros_gerais (cadastro_id, condominio_id, tipo, titulo, descricao, status, created_at, updated_at)
      values ('cad-004', 1, 'servico', 'Limpeza tecnica de reservatorio', 'Execucao mensal - Blocos A, B e C', 'active', systimestamp, to_timestamp_tz('2026-04-04T14:35:00.000Z', 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"'))
    ]';
    execute immediate q'[
      insert into cadastros_gerais (cadastro_id, condominio_id, tipo, titulo, descricao, status, created_at, updated_at)
      values ('cad-005', 1, 'morador', 'Fernanda Lima', 'Unidade C-309', 'inactive', systimestamp, to_timestamp_tz('2026-04-02T11:02:00.000Z', 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"'))
    ]';
    execute immediate q'[
      insert into cadastros_gerais (cadastro_id, condominio_id, tipo, titulo, descricao, status, created_at, updated_at)
      values ('cad-101', 2, 'unidade', 'Unidade D-101', 'Responsavel: Marcos Freitas', 'active', systimestamp, to_timestamp_tz('2026-04-05T09:10:00.000Z', 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"'))
    ]';
    execute immediate q'[
      insert into cadastros_gerais (cadastro_id, condominio_id, tipo, titulo, descricao, status, created_at, updated_at)
      values ('cad-102', 2, 'fornecedor', 'Limpeza Cond2 LTDA', 'Equipe de apoio predial', 'pending', systimestamp, to_timestamp_tz('2026-04-04T15:45:00.000Z', 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"'))
    ]';
  end if;

  commit;
end;
/
