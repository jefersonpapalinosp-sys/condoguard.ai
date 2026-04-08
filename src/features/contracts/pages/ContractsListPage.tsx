import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '../../../shared/ui/states/EmptyState';
import { ErrorState } from '../../../shared/ui/states/ErrorState';
import { ContractRiskBadge, ContractStatusBadge } from '../components/ContractsBadges';
import { ContractsLoadingSkeleton } from '../components/ContractsLoadingSkeleton';
import { ContractsPageShell } from '../components/ContractsPageShell';
import { closeContract, fetchContractsList, renewContract } from '../services/contractsManagementService';
import type { ContractRecord, ContractsListResponse, ContractStatus } from '../types/contracts';

const filterFieldClass =
  'rounded-xl border border-outline-variant/30 bg-surface-container-highest px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-fixed';

export default function ContractsListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<ContractsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ContractStatus | 'all'>('all');
  const [supplier, setSupplier] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [index, setIndex] = useState<'all' | 'IPCA' | 'IGPM' | 'INPC' | 'FIXO'>('all');
  const [risk, setRisk] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'contract' | 'supplier' | 'monthlyValue' | 'endDate' | 'nextAdjustment' | 'risk' | 'status'>('monthlyValue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [runningAction, setRunningAction] = useState<{ id: string; type: 'renew' | 'close' } | null>(null);

  function buildQuery() {
    return {
      page,
      pageSize: 12,
      search: search.trim() || undefined,
      status: status === 'all' ? undefined : status,
      supplier: supplier.trim() || undefined,
      serviceType: serviceType.trim() || undefined,
      index: index === 'all' ? undefined : index,
      risk: risk === 'all' ? undefined : risk,
      expiringOnly: expiringOnly || undefined,
      sortBy,
      sortOrder,
    };
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const response = await fetchContractsList(buildQuery());
        if (active) {
          setData(response);
          setError(null);
        }
      } catch {
        if (active) {
          setError('Falha ao carregar lista de contratos.');
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
  }, [expiringOnly, index, page, risk, search, serviceType, sortBy, sortOrder, status, supplier]);

  async function doRenew(item: ContractRecord) {
    setRunningAction({ id: item.id, type: 'renew' });
    try {
      await renewContract(item.id);
      setData(await fetchContractsList(buildQuery()));
    } finally {
      setRunningAction(null);
    }
  }

  async function doClose(item: ContractRecord) {
    setRunningAction({ id: item.id, type: 'close' });
    try {
      await closeContract(item.id);
      setData(await fetchContractsList(buildQuery()));
    } finally {
      setRunningAction(null);
    }
  }

  function actionButtons(item: ContractRecord, mobile: boolean) {
    const baseClass = mobile
      ? 'interactive-focus w-full rounded-lg px-3 py-2 text-xs font-bold'
      : 'interactive-focus rounded px-2 py-1 text-xs font-bold';

    return (
      <>
        <button
          type="button"
          aria-label={`Ver detalhes do contrato ${item.contractNumber}`}
          onClick={() => navigate(`/contracts/${item.id}`)}
          className={`${baseClass} bg-surface-container-highest text-on-surface`}
        >
          Ver
        </button>
        <button
          type="button"
          aria-label={`Editar contrato ${item.contractNumber}`}
          onClick={() => navigate(`/contracts/${item.id}/editar`)}
          className={`${baseClass} bg-surface-container-highest text-on-surface`}
        >
          Editar
        </button>
        <button
          type="button"
          aria-label={`Renovar contrato ${item.contractNumber}`}
          onClick={() => void doRenew(item)}
          disabled={runningAction?.id === item.id}
          className={`${baseClass} bg-primary text-on-primary disabled:opacity-50`}
        >
          {runningAction?.id === item.id && runningAction.type === 'renew' ? 'Renovando...' : 'Renovar'}
        </button>
        <button
          type="button"
          aria-label={`Encerrar contrato ${item.contractNumber}`}
          onClick={() => void doClose(item)}
          disabled={runningAction?.id === item.id}
          className={`${baseClass} bg-error text-white disabled:opacity-50`}
        >
          {runningAction?.id === item.id && runningAction.type === 'close' ? 'Encerrando...' : 'Encerrar'}
        </button>
        <button
          type="button"
          aria-label={`Gerenciar anexos do contrato ${item.contractNumber}`}
          onClick={() => navigate(`/contracts/documentos?contractId=${encodeURIComponent(item.id)}`)}
          className={`${baseClass} bg-surface-container-highest text-on-surface`}
        >
          Anexar
        </button>
      </>
    );
  }

  if (loading) {
    return (
      <ContractsLoadingSkeleton
        title="Lista de contratos"
        subtitle="Pesquisa, filtros, ordenacao e acoes operacionais para gestao contratual."
        variant="table"
        withAction
        message="Carregando lista de contratos..."
      />
    );
  }
  if (error || !data) return <ErrorState message={error || 'Falha ao carregar lista de contratos.'} />;

  return (
    <ContractsPageShell
      title="Lista de contratos"
      subtitle="Pesquisa, filtros, ordenacao e acoes operacionais para gestao contratual."
      actions={
        <Link to="/contracts/novo" className="interactive-focus rounded-lg monolith-gradient px-4 py-2 text-xs font-bold uppercase tracking-widest text-white">
          Novo contrato
        </Link>
      }
    >
      <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 md:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            aria-label="Buscar contratos"
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            placeholder="Buscar por fornecedor, contrato ou descricao..."
            className={filterFieldClass}
          />
          <select
            aria-label="Filtrar por status"
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value as ContractStatus | 'all');
            }}
            className={filterFieldClass}
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativo</option>
            <option value="expiring">Vencendo</option>
            <option value="renewal_pending">Renovacao pendente</option>
            <option value="expired">Vencido</option>
            <option value="closed">Encerrado</option>
            <option value="draft">Rascunho</option>
          </select>
          <input
            aria-label="Filtrar por fornecedor"
            value={supplier}
            onChange={(event) => {
              setPage(1);
              setSupplier(event.target.value);
            }}
            placeholder="Fornecedor"
            className={filterFieldClass}
          />
          <input
            aria-label="Filtrar por tipo de servico"
            value={serviceType}
            onChange={(event) => {
              setPage(1);
              setServiceType(event.target.value);
            }}
            placeholder="Tipo de servico"
            className={filterFieldClass}
          />
          <select
            aria-label="Filtrar por indice de reajuste"
            value={index}
            onChange={(event) => {
              setPage(1);
              setIndex(event.target.value as typeof index);
            }}
            className={filterFieldClass}
          >
            <option value="all">Todos os indices</option>
            <option value="IPCA">IPCA</option>
            <option value="IGPM">IGPM</option>
            <option value="INPC">INPC</option>
            <option value="FIXO">FIXO</option>
          </select>
          <select
            aria-label="Filtrar por risco"
            value={risk}
            onChange={(event) => {
              setPage(1);
              setRisk(event.target.value as typeof risk);
            }}
            className={filterFieldClass}
          >
            <option value="all">Todos os riscos</option>
            <option value="high">Alto</option>
            <option value="medium">Medio</option>
            <option value="low">Baixo</option>
          </select>
          <select
            aria-label="Ordenar contratos por"
            value={sortBy}
            onChange={(event) => {
              setPage(1);
              setSortBy(event.target.value as typeof sortBy);
            }}
            className={filterFieldClass}
          >
            <option value="monthlyValue">Ordenar por valor mensal</option>
            <option value="contract">Ordenar por contrato</option>
            <option value="supplier">Ordenar por fornecedor</option>
            <option value="endDate">Ordenar por vencimento</option>
            <option value="nextAdjustment">Ordenar por reajuste</option>
            <option value="status">Ordenar por status</option>
            <option value="risk">Ordenar por risco</option>
          </select>
          <select
            aria-label="Direcao da ordenacao"
            value={sortOrder}
            onChange={(event) => {
              setPage(1);
              setSortOrder(event.target.value as 'asc' | 'desc');
            }}
            className={filterFieldClass}
          >
            <option value="desc">Ordem decrescente</option>
            <option value="asc">Ordem crescente</option>
          </select>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-on-surface-variant">
          <input
            type="checkbox"
            checked={expiringOnly}
            onChange={(event) => {
              setPage(1);
              setExpiringOnly(event.target.checked);
            }}
          />
          Mostrar apenas contratos com vencimento proximo
        </label>
      </section>

      {runningAction ? (
        <p className="text-xs text-on-surface-variant" aria-live="polite">
          Atualizando contrato...
        </p>
      ) : null}

      {data.items.length === 0 ? (
        <EmptyState message="Nenhum contrato encontrado para os filtros selecionados." />
      ) : (
        <>
          <section className="space-y-3 md:hidden" aria-busy={runningAction?.id ? true : undefined}>
            {data.items.map((item) => (
              <article
                key={item.id}
                aria-label={`Contrato ${item.contractNumber} de ${item.supplier}`}
                className="hover-lift rounded-2xl border border-outline-variant/25 bg-surface-container-low p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">{item.contractNumber}</p>
                    <h3 className="mt-1 font-headline text-base font-bold">{item.name}</h3>
                    <p className="mt-1 text-xs text-on-surface-variant">{item.supplier}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <ContractStatusBadge status={item.status} />
                    <ContractRiskBadge risk={item.risk} />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-surface-container-highest px-2.5 py-2">
                    <p className="uppercase tracking-widest text-on-surface-variant">Categoria</p>
                    <p className="mt-1 font-semibold text-on-surface">{item.category}</p>
                  </div>
                  <div className="rounded-lg bg-surface-container-highest px-2.5 py-2">
                    <p className="uppercase tracking-widest text-on-surface-variant">Valor mensal</p>
                    <p className="mt-1 font-semibold text-on-surface">{item.monthlyValueLabel}</p>
                  </div>
                  <div className="rounded-lg bg-surface-container-highest px-2.5 py-2">
                    <p className="uppercase tracking-widest text-on-surface-variant">Vencimento</p>
                    <p className="mt-1 font-semibold text-on-surface">{item.endDate}</p>
                  </div>
                  <div className="rounded-lg bg-surface-container-highest px-2.5 py-2">
                    <p className="uppercase tracking-widest text-on-surface-variant">Prox. reajuste</p>
                    <p className="mt-1 font-semibold text-on-surface">{item.nextAdjustmentDate}</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">{actionButtons(item, true)}</div>
              </article>
            ))}
          </section>

          <section className="hidden overflow-x-auto rounded-2xl border border-outline-variant/30 bg-surface-container-low p-5 md:block" aria-busy={runningAction?.id ? true : undefined}>
            <table className="w-full min-w-[1080px] text-sm">
              <caption className="sr-only">Lista operacional de contratos com status, risco e acoes.</caption>
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant">
                  <th scope="col" className="py-3">Contrato</th>
                  <th scope="col" className="py-3">Fornecedor</th>
                  <th scope="col" className="py-3">Categoria</th>
                  <th scope="col" className="py-3">Valor mensal</th>
                  <th scope="col" className="py-3">Inicio</th>
                  <th scope="col" className="py-3">Fim</th>
                  <th scope="col" className="py-3">Indice</th>
                  <th scope="col" className="py-3">Prox. reajuste</th>
                  <th scope="col" className="py-3">Status</th>
                  <th scope="col" className="py-3">Risco</th>
                  <th scope="col" className="py-3">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} className="border-t border-outline-variant/20">
                    <th scope="row" className="py-3 text-left">
                      <p className="font-bold">{item.contractNumber}</p>
                      <p className="text-xs text-on-surface-variant">{item.name}</p>
                    </th>
                    <td className="py-3">{item.supplier}</td>
                    <td className="py-3">{item.category}</td>
                    <td className="py-3 font-semibold">{item.monthlyValueLabel}</td>
                    <td className="py-3">{item.startDate}</td>
                    <td className="py-3">{item.endDate}</td>
                    <td className="py-3">{item.index}</td>
                    <td className="py-3">{item.nextAdjustmentDate}</td>
                    <td className="py-3">
                      <ContractStatusBadge status={item.status} />
                    </td>
                    <td className="py-3">
                      <ContractRiskBadge risk={item.risk} />
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">{actionButtons(item, false)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold text-on-surface-variant">
            Pagina {data.meta.page} de {data.meta.totalPages} | Total: {data.meta.total}
          </p>
          <div className="flex gap-2">
              <button
                type="button"
                aria-label="Pagina anterior"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={!data.meta.hasPrevious}
                className="interactive-focus rounded-lg bg-surface-container-highest px-3 py-2 text-xs font-bold disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                type="button"
                aria-label="Proxima pagina"
                onClick={() => setPage((current) => current + 1)}
                disabled={!data.meta.hasNext}
                className="interactive-focus rounded-lg bg-primary px-3 py-2 text-xs font-bold text-on-primary disabled:opacity-50"
              >
                Proxima
              </button>
          </div>
        </div>
      </section>
    </ContractsPageShell>
  );
}
