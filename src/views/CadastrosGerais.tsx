import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createCadastroData, fetchCadastrosData, updateCadastroStatusData, type CadastroRegistro, type CadastroStatus, type CadastroTipo } from '../services/cadastrosService';
import { DataSourceBadge } from '../shared/ui/DataSourceBadge';
import { EmptyState } from '../shared/ui/states/EmptyState';
import { ErrorState } from '../shared/ui/states/ErrorState';
import { LoadingState } from '../shared/ui/states/LoadingState';

const statusClass: Record<CadastroStatus, string> = {
  active: 'bg-tertiary-fixed-dim/30 text-on-tertiary-fixed-variant',
  pending: 'bg-secondary-container text-on-secondary-container',
  inactive: 'bg-surface-container-highest text-on-surface-variant',
};

const statusLabel: Record<CadastroStatus, string> = {
  active: 'Ativo',
  pending: 'Pendente',
  inactive: 'Inativo',
};

const tipoLabel: Record<CadastroTipo, string> = {
  unidade: 'Unidade',
  morador: 'Morador',
  fornecedor: 'Fornecedor',
  servico: 'Servico',
};

function formatUpdatedAt(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return 'Atualizacao recente';
  }

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CadastrosGerais() {
  const [tipo, setTipo] = useState<'todos' | CadastroTipo>('todos');
  const [busca, setBusca] = useState('');
  const [items, setItems] = useState<CadastroRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const response = await fetchCadastrosData();
        if (active) {
          setItems(response.items);
          setError(null);
        }
      } catch {
        if (active) {
          setError('Falha ao carregar cadastros.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const filtrados = useMemo(() => {
    return items.filter((item) => {
      const matchTipo = tipo === 'todos' || item.tipo === tipo;
      const termo = busca.trim().toLowerCase();
      const matchBusca =
        termo.length === 0 ||
        item.titulo.toLowerCase().includes(termo) ||
        item.descricao.toLowerCase().includes(termo);
      return matchTipo && matchBusca;
    });
  }, [busca, tipo, items]);

  const indicadores = useMemo(() => {
    const ativos = items.filter((item) => item.status === 'active').length;
    const pendentes = items.filter((item) => item.status === 'pending').length;
    const inativos = items.filter((item) => item.status === 'inactive').length;
    return { total: items.length, ativos, pendentes, inativos };
  }, [items]);

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      tipo: String(form.get('tipo') || '') as CadastroTipo,
      titulo: String(form.get('titulo') || '').trim(),
      descricao: String(form.get('descricao') || '').trim(),
      status: String(form.get('status') || '') as CadastroStatus,
    };

    if (!payload.tipo || !payload.titulo || !payload.descricao || !payload.status) {
      setCreateError('Preencha tipo, titulo, descricao e status.');
      return;
    }

    try {
      setCreating(true);
      const created = await createCadastroData(payload);
      setItems((current) => [created, ...current]);
      setShowCreateForm(false);
      setCreateSuccess('Cadastro criado com sucesso.');
      (event.currentTarget as HTMLFormElement).reset();
    } catch {
      setCreateError('Nao foi possivel criar o cadastro no momento.');
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusUpdate(id: string, status: CadastroStatus) {
    setCreateError(null);
    setCreateSuccess(null);
    setUpdatingId(id);

    try {
      const updated = await updateCadastroStatusData(id, status);
      setItems((current) => current.map((item) => (item.id === id ? updated : item)));
      setCreateSuccess('Status atualizado com sucesso.');
    } catch {
      setCreateError('Nao foi possivel atualizar o status no momento.');
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return <LoadingState message="Carregando cadastros..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="font-headline text-2xl md:text-4xl font-extrabold tracking-tighter text-on-surface">Cadastros Gerais</h3>
          <p className="text-on-surface-variant font-body mt-2">
            Centro unificado para cadastros de unidades, moradores, fornecedores e servicos.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DataSourceBadge module="cadastros" />
          <button
            type="button"
            onClick={() => {
              setShowCreateForm((current) => !current);
              setCreateError(null);
              setCreateSuccess(null);
            }}
            className="px-5 py-3 rounded-lg monolith-gradient text-white font-bold text-xs uppercase tracking-widest w-fit"
          >
            {showCreateForm ? 'Fechar' : 'Novo Cadastro'}
          </button>
        </div>
      </section>

      {createSuccess ? (
        <section className="rounded-xl border border-tertiary-fixed-dim/50 bg-tertiary-fixed-dim/20 px-4 py-3">
          <p className="text-sm font-semibold text-on-tertiary-fixed-variant">{createSuccess}</p>
        </section>
      ) : null}

      {showCreateForm ? (
        <section className="bg-surface-container-low rounded-xl p-6">
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleCreateSubmit}>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Tipo
              <select name="tipo" className="mt-2 w-full px-3 py-2 rounded-lg bg-surface-container-highest">
                <option value="unidade">Unidade</option>
                <option value="morador">Morador</option>
                <option value="fornecedor">Fornecedor</option>
                <option value="servico">Servico</option>
              </select>
            </label>

            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Status
              <select name="status" className="mt-2 w-full px-3 py-2 rounded-lg bg-surface-container-highest">
                <option value="active">Ativo</option>
                <option value="pending">Pendente</option>
                <option value="inactive">Inativo</option>
              </select>
            </label>

            <label className="md:col-span-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Titulo
              <input
                name="titulo"
                maxLength={120}
                className="mt-2 w-full px-3 py-2 rounded-lg bg-surface-container-highest outline-none focus:ring-2 focus:ring-primary-fixed"
                placeholder="Ex.: Unidade A-120"
              />
            </label>

            <label className="md:col-span-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Descricao
              <input
                name="descricao"
                maxLength={240}
                className="mt-2 w-full px-3 py-2 rounded-lg bg-surface-container-highest outline-none focus:ring-2 focus:ring-primary-fixed"
                placeholder="Ex.: Responsavel, contrato ou observacao"
              />
            </label>

            <div className="md:col-span-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 rounded-lg monolith-gradient text-white text-xs font-bold uppercase tracking-widest disabled:opacity-50"
              >
                {creating ? 'Salvando...' : 'Salvar cadastro'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setCreateError(null);
                }}
                className="px-4 py-2 rounded-lg bg-surface-container-highest text-on-surface text-xs font-bold uppercase tracking-widest"
              >
                Cancelar
              </button>
              {createError ? <span className="text-xs text-error">{createError}</span> : null}
            </div>
          </form>
        </section>
      ) : null}

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <article className="bg-surface-container-highest p-6 rounded-xl">
          <p className="text-on-surface-variant text-xs uppercase tracking-widest">Total de registros</p>
          <h4 className="text-2xl md:text-3xl font-headline font-extrabold mt-2">{indicadores.total}</h4>
        </article>
        <article className="bg-surface-container-highest p-6 rounded-xl">
          <p className="text-on-surface-variant text-xs uppercase tracking-widest">Ativos</p>
          <h4 className="text-2xl md:text-3xl font-headline font-extrabold mt-2">{indicadores.ativos}</h4>
        </article>
        <article className="bg-surface-container-highest p-6 rounded-xl">
          <p className="text-on-surface-variant text-xs uppercase tracking-widest">Pendentes</p>
          <h4 className="text-2xl md:text-3xl font-headline font-extrabold mt-2">{indicadores.pendentes}</h4>
        </article>
        <article className="bg-surface-container-highest p-6 rounded-xl">
          <p className="text-on-surface-variant text-xs uppercase tracking-widest">Inativos</p>
          <h4 className="text-2xl md:text-3xl font-headline font-extrabold mt-2">{indicadores.inativos}</h4>
        </article>
      </section>

      <section className="bg-surface-container-low rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`px-4 py-2 rounded-full text-xs font-bold ${tipo === 'todos' ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface'}`}
            onClick={() => setTipo('todos')}
          >
            Todos
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-full text-xs font-bold ${tipo === 'unidade' ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface'}`}
            onClick={() => setTipo('unidade')}
          >
            Unidades
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-full text-xs font-bold ${tipo === 'morador' ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface'}`}
            onClick={() => setTipo('morador')}
          >
            Moradores
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-full text-xs font-bold ${tipo === 'fornecedor' ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface'}`}
            onClick={() => setTipo('fornecedor')}
          >
            Fornecedores
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-full text-xs font-bold ${tipo === 'servico' ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface'}`}
            onClick={() => setTipo('servico')}
          >
            Servicos
          </button>
        </div>

        <div>
          <label htmlFor="busca-cadastro" className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
            Busca rapida
          </label>
          <input
            id="busca-cadastro"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Busque por nome, unidade, fornecedor ou servico..."
            className="w-full px-4 py-3 bg-surface-container-highest rounded-lg outline-none focus:ring-2 focus:ring-primary-fixed"
          />
        </div>
      </section>

      <section className="space-y-3">
        {filtrados.length === 0 ? (
          <EmptyState message="Nenhum registro encontrado para os filtros selecionados." />
        ) : (
          filtrados.map((item) => (
            <article key={item.id} className="bg-surface-container-low rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">{tipoLabel[item.tipo]}</p>
                  <h4 className="font-headline text-xl font-bold mt-1">{item.titulo}</h4>
                  <p className="text-sm text-on-surface-variant mt-1">{item.descricao}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold ${statusClass[item.status]}`}>{statusLabel[item.status]}</span>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleStatusUpdate(item.id, 'active')}
                    disabled={updatingId === item.id || item.status === 'active'}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 ${
                      item.status === 'active' ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface'
                    }`}
                  >
                    Ativo
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleStatusUpdate(item.id, 'pending')}
                    disabled={updatingId === item.id || item.status === 'pending'}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 ${
                      item.status === 'pending' ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface'
                    }`}
                  >
                    Pendente
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleStatusUpdate(item.id, 'inactive')}
                    disabled={updatingId === item.id || item.status === 'inactive'}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 ${
                      item.status === 'inactive' ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface'
                    }`}
                  >
                    Inativo
                  </button>
                </div>

                <div className="text-[11px] uppercase tracking-widest text-on-surface-variant">
                  {updatingId === item.id ? 'Atualizando...' : formatUpdatedAt(item.updatedAt)}
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
