import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '../../../shared/ui/states/EmptyState';
import { ErrorState } from '../../../shared/ui/states/ErrorState';
import { ContractRiskBadge, ContractStatusBadge } from '../components/ContractsBadges';
import { ContractsLoadingSkeleton } from '../components/ContractsLoadingSkeleton';
import { ContractsPageShell } from '../components/ContractsPageShell';
import { closeContract, fetchContractsList, renewContract } from '../services/contractsManagementService';
import type { ContractRecord, ContractsListResponse, ContractStatus } from '../types/contracts';

const filterFieldClass =
  'interactive-focus w-full rounded-xl border border-outline-variant/35 bg-surface-container-highest px-3 py-2.5 text-sm text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/80 focus:border-primary-fixed';
const filterLabelClass = 'text-[11px] font-semibold uppercase tracking-[0.15em] text-on-surface-variant';
const statusLabel: Record<ContractStatus, string> = {
  active: 'Ativo',
  expiring: 'Vencendo',
  renewal_pending: 'Renovacao pendente',
  expired: 'Vencido',
  closed: 'Encerrado',
  draft: 'Rascunho',
};

export default function ContractsListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<ContractsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
  const hasLoadedOnceRef = useRef(false);
  const appliedFilters = useMemo(() => {
    const list: string[] = [];

    if (search.trim()) list.push(`Busca: ${search.trim()}`);
    if (status !== 'all') list.push(`Status: ${statusLabel[status]}`);
    if (supplier.trim()) list.push(`Fornecedor: ${supplier.trim()}`);
    if (serviceType.trim()) list.push(`Servico: ${serviceType.trim()}`);
    if (index !== 'all') list.push(`Indice: ${index}`);
    if (risk !== 'all') list.push(`Risco: ${risk === 'high' ? 'Alto' : risk === 'medium' ? 'Medio' : 'Baixo'}`);
    if (expiringOnly) list.push('Apenas vencimento proximo');
    if (sortBy !== 'monthlyValue') list.push('Ordenacao personalizada');
    if (sortOrder !== 'desc') list.push('Ordem crescente');

    return list;
  }, [expiringOnly, index, risk, search, serviceType, sortBy, sortOrder, status, supplier]);

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

  function resetFilters() {
    setPage(1);
    setSearch('');
    setStatus('all');
    setSupplier('');
    setServiceType('');
    setIndex('all');
    setRisk('all');
    setExpiringOnly(false);
    setSortBy('monthlyValue');
    setSortOrder('desc');
  }

  useEffect(() => {
    let active = true;
    async function load() {
      const isRefreshing = hasLoadedOnceRef.current;

      try {
        if (isRefreshing) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        const response = await fetchContractsList(buildQuery());
        if (active) {
          setData(response);
          setError(null);
          hasLoadedOnceRef.current = true;
        }
      } catch {
        if (active) {
          setError(isRefreshing ? 'Falha ao atualizar lista de contratos.' : 'Falha ao carregar lista de contratos.');
        }
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
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
      setError(null);
    } catch {
      setError('Falha ao renovar contrato.');
    } finally {
      setRunningAction(null);
    }
  }

  async function doClose(item: ContractRecord) {
    setRunningAction({ id: item.id, type: 'close' });
    try {
      await closeContract(item.id);
      setData(await fetchContractsList(buildQuery()));
      setError(null);
    } catch {
      setError('Falha ao encerrar contrato.');
    } finally {
      setRunningAction(null);
    }
  }

  function actionButtons(item: ContractRecord, mobile: boolean) {
    const baseClass = mobile
      ? 'interactive-focus inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors'
      : 'interactive-focus inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors';
    const iconClass = 'material-symbols-outlined text-[15px] leading-none';

    return (
      <>
        <button
          type="button"
          aria-label={`Ver detalhes do contrato ${item.contractNumber}`}
          onClick={() => navigate(`/contracts/${item.id}`)}
          className={`${baseClass} bg-surface-container-highest text-on-surface hover:bg-surface-container-high`}
        >
          <span aria-hidden="true" className={iconClass}>visibility</span>
          Ver
        </button>
        <button
          type="button"
          aria-label={`Editar contrato ${item.contractNumber}`}
          onClick={() => navigate(`/contracts/${item.id}/editar`)}
          className={`${baseClass} bg-surface-container-highest text-on-surface hover:bg-surface-container-high`}
        >
          <span aria-hidden="true" className={iconClass}>edit</span>
          Editar
        </button>
        <button
          type="button"
          aria-label={`Renovar contrato ${item.contractNumber}`}
          onClick={() => void doRenew(item)}
          disabled={runningAction?.id === item.id}
          className={`${baseClass} monolith-gradient text-on-primary disabled:opacity-50`}
        >
          <span aria-hidden="true" className={iconClass}>autorenew</span>
          {runningAction?.id === item.id && runningAction.type === 'renew' ? 'Renovando...' : 'Renovar'}
        </button>
        <button
          type="button"
          aria-label={`Encerrar contrato ${item.contractNumber}`}
          onClick={() => void doClose(item)}
          disabled={runningAction?.id === item.id}
          className={`${baseClass} bg-error text-white hover:bg-error/90 disabled:opacity-50`}
        >
          <span aria-hidden="true" className={iconClass}>cancel</span>
          {runningAction?.id === item.id && runningAction.type === 'close' ? 'Encerrando...' : 'Encerrar'}
        </button>
        <button
          type="button"
          aria-label={`Gerenciar anexos do contrato ${item.contractNumber}`}
          onClick={() => navigate(`/contracts/documentos?contractId=${encodeURIComponent(item.id)}`)}
          className={`${baseClass} bg-surface-container-highest text-on-surface hover:bg-surface-container-high`}
        >
          <span aria-hidden="true" className={iconClass}>attach_file</span>
          Anexar
        </button>
      </>
    );
  }

  if (loading && !data) {
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
  if (!data) return <ErrorState message={error || 'Falha ao carregar lista de contratos.'} />;

  const highRiskOnPage = data.items.filter((item) => item.risk === 'high').length;
  const expiringOnPage = data.items.filter((item) => item.status === 'expiring').length;
  const showingFrom = data.meta.total === 0 ? 0 : (data.meta.page - 1) * data.meta.pageSize + 1;
  const showingTo = data.meta.total === 0 ? 0 : Math.min(data.meta.page * data.meta.pageSize, data.meta.total);

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
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="motion-fade-up rounded-2xl bg-primary-container p-4 text-white">
          <p className="text-[10px] uppercase tracking-widest text-white/75">Total da carteira</p>
          <h3 className="mt-2 text-2xl font-headline font-extrabold">{data.meta.total}</h3>
          <p className="mt-1 text-xs text-white/85">Contratos encontrados para o filtro atual.</p>
        </article>
        <article className="motion-fade-up motion-delay-1 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4">
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Visao da pagina</p>
          <h3 className="mt-2 text-2xl font-headline font-extrabold text-on-surface">{data.items.length}</h3>
          <p className="mt-1 text-xs text-on-surface-variant">Itens exibidos nesta pagina.</p>
        </article>
        <article className="motion-fade-up motion-delay-1 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4">
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Risco alto (pagina)</p>
          <h3 className="mt-2 text-2xl font-headline font-extrabold text-on-surface">{highRiskOnPage}</h3>
          <p className="mt-1 text-xs text-on-surface-variant">Contratos com prioridade de mitigacao.</p>
        </article>
        <article className="motion-fade-up motion-delay-2 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4">
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Vencendo (pagina)</p>
          <h3 className="mt-2 text-2xl font-headline font-extrabold text-on-surface">{expiringOnPage}</h3>
          <p className="mt-1 text-xs text-on-surface-variant">Contratos com prazo proximo.</p>
        </article>
      </section>

      <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 md:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Filtros inteligentes</p>
            <h3 className="mt-1 font-headline text-lg font-extrabold md:text-xl">Refine a carteira de contratos</h3>
            <p className="mt-1 text-sm text-on-surface-variant">Busque rapidamente por fornecedor, status, risco e classificacao financeira.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-surface-container-highest px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
              {appliedFilters.length} filtro(s) ativo(s)
            </span>
            <button
              type="button"
              onClick={resetFilters}
              disabled={appliedFilters.length === 0}
              className="interactive-focus rounded-xl border border-outline-variant/40 bg-surface-container-highest px-3 py-2 text-xs font-bold text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-55"
            >
              Limpar filtros
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1.5">
            <span className={filterLabelClass}>Busca geral</span>
            <input
              aria-label="Buscar contratos"
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Contrato, fornecedor ou descricao"
              className={filterFieldClass}
            />
          </label>

          <label className="space-y-1.5">
            <span className={filterLabelClass}>Status contratual</span>
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
          </label>

          <label className="space-y-1.5">
            <span className={filterLabelClass}>Fornecedor</span>
            <input
              aria-label="Filtrar por fornecedor"
              value={supplier}
              list={data.facets.suppliers.length > 0 ? 'contracts-suppliers' : undefined}
              onChange={(event) => {
                setPage(1);
                setSupplier(event.target.value);
              }}
              placeholder="Nome do fornecedor"
              className={filterFieldClass}
            />
          </label>

          <label className="space-y-1.5">
            <span className={filterLabelClass}>Tipo de servico</span>
            <input
              aria-label="Filtrar por tipo de servico"
              value={serviceType}
              list={data.facets.serviceTypes.length > 0 ? 'contracts-service-types' : undefined}
              onChange={(event) => {
                setPage(1);
                setServiceType(event.target.value);
              }}
              placeholder="Categoria do servico"
              className={filterFieldClass}
            />
          </label>

          <label className="space-y-1.5">
            <span className={filterLabelClass}>Indice de reajuste</span>
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
          </label>

          <label className="space-y-1.5">
            <span className={filterLabelClass}>Nivel de risco</span>
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
          </label>

          <label className="space-y-1.5">
            <span className={filterLabelClass}>Ordenar por</span>
            <select
              aria-label="Ordenar contratos por"
              value={sortBy}
              onChange={(event) => {
                setPage(1);
                setSortBy(event.target.value as typeof sortBy);
              }}
              className={filterFieldClass}
            >
              <option value="monthlyValue">Valor mensal</option>
              <option value="contract">Contrato</option>
              <option value="supplier">Fornecedor</option>
              <option value="endDate">Vencimento</option>
              <option value="nextAdjustment">Prox. reajuste</option>
              <option value="status">Status</option>
              <option value="risk">Risco</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className={filterLabelClass}>Ordem</span>
            <select
              aria-label="Direcao da ordenacao"
              value={sortOrder}
              onChange={(event) => {
                setPage(1);
                setSortOrder(event.target.value as 'asc' | 'desc');
              }}
              className={filterFieldClass}
            >
              <option value="desc">Decrescente</option>
              <option value="asc">Crescente</option>
            </select>
          </label>
        </div>

        {data.facets.suppliers.length > 0 ? (
          <datalist id="contracts-suppliers">
            {data.facets.suppliers.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        ) : null}

        {data.facets.serviceTypes.length > 0 ? (
          <datalist id="contracts-service-types">
            {data.facets.serviceTypes.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        ) : null}

        <label className="mt-4 flex items-start gap-3 rounded-xl border border-outline-variant/25 bg-surface-container-highest/60 px-3 py-3 text-sm text-on-surface-variant">
          <input
            type="checkbox"
            checked={expiringOnly}
            onChange={(event) => {
              setPage(1);
              setExpiringOnly(event.target.checked);
            }}
            className="mt-0.5 h-4 w-4 rounded border-outline-variant accent-primary"
          />
          <span>
            <span className="block font-semibold text-on-surface">Apenas vencimento proximo</span>
            <span className="block text-xs text-on-surface-variant">Mantem na lista somente contratos com janela curta para renovacao ou encerramento.</span>
          </span>
        </label>

        {appliedFilters.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {appliedFilters.map((item) => (
              <span
                key={item}
                className="rounded-full border border-outline-variant/30 bg-surface-container-highest px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant"
              >
                {item}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      {runningAction ? (
        <p className="rounded-xl border border-primary-fixed/40 bg-primary-fixed/25 px-3 py-2 text-xs font-semibold text-on-surface-variant" aria-live="polite">
          Atualizando contrato selecionado...
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-error/30 bg-error-container/40 px-3 py-2 text-xs font-semibold text-on-error-container" role="status" aria-live="polite">
          {error}
        </p>
      ) : null}

      <div className="relative" aria-busy={refreshing ? true : undefined}>
        {data.items.length === 0 ? (
          <EmptyState message="Nenhum contrato encontrado para os filtros selecionados." />
        ) : (
          <>
            <section className="space-y-3 md:hidden" aria-busy={runningAction?.id ? true : undefined}>
              {data.items.map((item) => (
                <article
                  key={item.id}
                  aria-label={`Contrato ${item.contractNumber} de ${item.supplier}`}
                  className="motion-fade-up hover-lift rounded-2xl border border-outline-variant/25 bg-surface-container-low p-4"
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
                      <p className="uppercase tracking-widest text-on-surface-variant">Fim</p>
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

            <section className="hidden rounded-2xl border border-outline-variant/30 bg-surface-container-low md:block" aria-busy={runningAction?.id ? true : undefined}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] text-sm">
                  <caption className="sr-only">Lista operacional de contratos com status, risco e acoes.</caption>
                  <thead className="bg-surface-container-highest/70">
                    <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant">
                      <th scope="col" className="px-3 py-3">Contrato</th>
                      <th scope="col" className="px-3 py-3">Fornecedor</th>
                      <th scope="col" className="px-3 py-3">Categoria</th>
                      <th scope="col" className="px-3 py-3">Valor mensal</th>
                      <th scope="col" className="px-3 py-3">Inicio</th>
                      <th scope="col" className="px-3 py-3">Fim</th>
                      <th scope="col" className="px-3 py-3">Indice</th>
                      <th scope="col" className="px-3 py-3">Prox. reajuste</th>
                      <th scope="col" className="px-3 py-3">Status</th>
                      <th scope="col" className="px-3 py-3">Risco</th>
                      <th scope="col" className="px-3 py-3">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item) => (
                      <tr key={item.id} className="border-t border-outline-variant/20 align-top transition-colors hover:bg-surface-container-high/35">
                        <th scope="row" className="px-3 py-3 text-left">
                          <p className="font-bold">{item.contractNumber}</p>
                          <p className="max-w-[20rem] text-xs text-on-surface-variant">{item.name}</p>
                        </th>
                        <td className="px-3 py-3">{item.supplier}</td>
                        <td className="px-3 py-3">{item.category}</td>
                        <td className="px-3 py-3 font-semibold">{item.monthlyValueLabel}</td>
                        <td className="px-3 py-3">{item.startDate}</td>
                        <td className="px-3 py-3">{item.endDate}</td>
                        <td className="px-3 py-3">{item.index}</td>
                        <td className="px-3 py-3">{item.nextAdjustmentDate}</td>
                        <td className="px-3 py-3">
                          <ContractStatusBadge status={item.status} />
                        </td>
                        <td className="px-3 py-3">
                          <ContractRiskBadge risk={item.risk} />
                        </td>
                        <td className="px-3 py-3">
                          <div className="grid grid-cols-2 gap-1.5 xl:flex xl:flex-wrap">{actionButtons(item, false)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {refreshing ? (
          <div className="pointer-events-none absolute inset-0 flex items-start justify-end rounded-2xl p-3">
            <div className="flex items-center gap-2 rounded-full border border-outline-variant/35 bg-surface-container-low px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant shadow-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" aria-hidden="true" />
              Atualizando lista...
            </div>
          </div>
        ) : null}
      </div>

      <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 md:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-on-surface-variant">
              Exibindo {showingFrom}-{showingTo} de {data.meta.total} contratos
            </p>
            <p className="text-[11px] uppercase tracking-widest text-on-surface-variant">
              Pagina {data.meta.page} de {data.meta.totalPages}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Pagina anterior"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={!data.meta.hasPrevious}
              className="interactive-focus rounded-lg border border-outline-variant/30 bg-surface-container-highest px-3 py-2 text-xs font-bold text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              aria-label="Proxima pagina"
              onClick={() => setPage((current) => current + 1)}
              disabled={!data.meta.hasNext}
              className="interactive-focus rounded-lg monolith-gradient px-3 py-2 text-xs font-bold text-on-primary disabled:opacity-50"
            >
              Proxima
            </button>
          </div>
        </div>
      </section>
    </ContractsPageShell>
  );
}
