import { useMemo, useState } from 'react';

type CadastroTipo = 'unidade' | 'morador' | 'fornecedor' | 'servico';

type CadastroRegistro = {
  id: string;
  tipo: CadastroTipo;
  titulo: string;
  descricao: string;
  status: 'ativo' | 'pendente' | 'inativo';
  atualizadoEm: string;
};

const registros: CadastroRegistro[] = [
  {
    id: 'cad-001',
    tipo: 'unidade',
    titulo: 'Unidade A-101',
    descricao: 'Responsavel: Maria Silva',
    status: 'ativo',
    atualizadoEm: 'Hoje, 09:22',
  },
  {
    id: 'cad-002',
    tipo: 'morador',
    titulo: 'Carlos Souza',
    descricao: 'Unidade B-204',
    status: 'ativo',
    atualizadoEm: 'Hoje, 08:41',
  },
  {
    id: 'cad-003',
    tipo: 'fornecedor',
    titulo: 'Elevadores Prime LTDA',
    descricao: 'Contrato de manutencao preventiva',
    status: 'pendente',
    atualizadoEm: 'Ontem, 17:10',
  },
  {
    id: 'cad-004',
    tipo: 'servico',
    titulo: 'Limpeza tecnica de reservatorio',
    descricao: 'Execucao mensal - Blocos A, B e C',
    status: 'ativo',
    atualizadoEm: 'Ontem, 14:35',
  },
  {
    id: 'cad-005',
    tipo: 'morador',
    titulo: 'Fernanda Lima',
    descricao: 'Unidade C-309',
    status: 'inativo',
    atualizadoEm: '02/04/2026, 11:02',
  },
];

const statusClass: Record<CadastroRegistro['status'], string> = {
  ativo: 'bg-tertiary-fixed-dim/30 text-on-tertiary-fixed-variant',
  pendente: 'bg-secondary-container text-on-secondary-container',
  inativo: 'bg-surface-container-highest text-on-surface-variant',
};

const tipoLabel: Record<CadastroTipo, string> = {
  unidade: 'Unidade',
  morador: 'Morador',
  fornecedor: 'Fornecedor',
  servico: 'Servico',
};

export default function CadastrosGerais() {
  const [tipo, setTipo] = useState<'todos' | CadastroTipo>('todos');
  const [busca, setBusca] = useState('');

  const filtrados = useMemo(() => {
    return registros.filter((item) => {
      const matchTipo = tipo === 'todos' || item.tipo === tipo;
      const termo = busca.trim().toLowerCase();
      const matchBusca =
        termo.length === 0 ||
        item.titulo.toLowerCase().includes(termo) ||
        item.descricao.toLowerCase().includes(termo);
      return matchTipo && matchBusca;
    });
  }, [busca, tipo]);

  const indicadores = useMemo(() => {
    const ativos = registros.filter((item) => item.status === 'ativo').length;
    const pendentes = registros.filter((item) => item.status === 'pendente').length;
    const inativos = registros.filter((item) => item.status === 'inativo').length;
    return { total: registros.length, ativos, pendentes, inativos };
  }, []);

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="font-headline text-2xl md:text-4xl font-extrabold tracking-tighter text-on-surface">Cadastros Gerais</h3>
          <p className="text-on-surface-variant font-body mt-2">
            Centro unificado para cadastros de unidades, moradores, fornecedores e servicos.
          </p>
        </div>
        <button className="px-5 py-3 rounded-lg monolith-gradient text-white font-bold text-xs uppercase tracking-widest w-fit">
          Novo Cadastro
        </button>
      </section>

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
            className={`px-4 py-2 rounded-full text-xs font-bold ${tipo === 'todos' ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface'}`}
            onClick={() => setTipo('todos')}
          >
            Todos
          </button>
          <button
            className={`px-4 py-2 rounded-full text-xs font-bold ${tipo === 'unidade' ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface'}`}
            onClick={() => setTipo('unidade')}
          >
            Unidades
          </button>
          <button
            className={`px-4 py-2 rounded-full text-xs font-bold ${tipo === 'morador' ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface'}`}
            onClick={() => setTipo('morador')}
          >
            Moradores
          </button>
          <button
            className={`px-4 py-2 rounded-full text-xs font-bold ${tipo === 'fornecedor' ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface'}`}
            onClick={() => setTipo('fornecedor')}
          >
            Fornecedores
          </button>
          <button
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
          <article className="bg-surface-container-low rounded-xl p-6">
            <p className="text-sm text-on-surface-variant">Nenhum registro encontrado para os filtros selecionados.</p>
          </article>
        ) : (
          filtrados.map((item) => (
            <article key={item.id} className="bg-surface-container-low rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">{tipoLabel[item.tipo]}</p>
                  <h4 className="font-headline text-xl font-bold mt-1">{item.titulo}</h4>
                  <p className="text-sm text-on-surface-variant mt-1">{item.descricao}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold ${statusClass[item.status]}`}>{item.status}</span>
              </div>
              <div className="mt-4 text-[11px] uppercase tracking-widest text-on-surface-variant">{item.atualizadoEm}</div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
