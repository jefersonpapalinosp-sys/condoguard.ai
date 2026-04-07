import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '../../../shared/ui/states/EmptyState';
import { ErrorState } from '../../../shared/ui/states/ErrorState';
import { LoadingState } from '../../../shared/ui/states/LoadingState';
import { ContractRiskBadge, ContractStatusBadge } from '../components/ContractsBadges';
import { ContractsPageShell } from '../components/ContractsPageShell';
import { closeContract, fetchContractsList, renewContract } from '../services/contractsManagementService';
import type { ContractRecord, ContractsListResponse, ContractStatus } from '../types/contracts';

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
  const [runningActionId, setRunningActionId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const response = await fetchContractsList({
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
        });
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
    setRunningActionId(item.id);
    try {
      await renewContract(item.id);
      const refreshed = await fetchContractsList({
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
      });
      setData(refreshed);
    } finally {
      setRunningActionId(null);
    }
  }

  async function doClose(item: ContractRecord) {
    setRunningActionId(item.id);
    try {
      await closeContract(item.id);
      const refreshed = await fetchContractsList({
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
      });
      setData(refreshed);
    } finally {
      setRunningActionId(null);
    }
  }

  if (loading) return <LoadingState message="Carregando lista de contratos..." />;
  if (error || !data) return <ErrorState message={error || 'Falha ao carregar lista de contratos.'} />;

  return (
    <ContractsPageShell
      title="Lista de contratos"
      subtitle="Pesquisa, filtros, ordenacao e acoes operacionais para gestao contratual."
      actions={
        <Link to="/contracts/novo" className="px-4 py-2 rounded-lg monolith-gradient text-white text-xs font-bold uppercase tracking-widest">
          Novo contrato
        </Link>
      }
    >
      <section className="bg-surface-container-low rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <input
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            placeholder="Buscar por fornecedor, contrato ou descricao..."
            className="px-3 py-2 rounded-lg bg-surface-container-highest outline-none"
          />
          <select
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value as ContractStatus | 'all');
            }}
            className="px-3 py-2 rounded-lg bg-surface-container-highest outline-none"
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
            value={supplier}
            onChange={(event) => {
              setPage(1);
              setSupplier(event.target.value);
            }}
            placeholder="Fornecedor"
            className="px-3 py-2 rounded-lg bg-surface-container-highest outline-none"
          />
          <input
            value={serviceType}
            onChange={(event) => {
              setPage(1);
              setServiceType(event.target.value);
            }}
            placeholder="Tipo de servico"
            className="px-3 py-2 rounded-lg bg-surface-container-highest outline-none"
          />
          <select
            value={index}
            onChange={(event) => {
              setPage(1);
              setIndex(event.target.value as typeof index);
            }}
            className="px-3 py-2 rounded-lg bg-surface-container-highest outline-none"
          >
            <option value="all">Todos os indices</option>
            <option value="IPCA">IPCA</option>
            <option value="IGPM">IGPM</option>
            <option value="INPC">INPC</option>
            <option value="FIXO">FIXO</option>
          </select>
          <select
            value={risk}
            onChange={(event) => {
              setPage(1);
              setRisk(event.target.value as typeof risk);
            }}
            className="px-3 py-2 rounded-lg bg-surface-container-highest outline-none"
          >
            <option value="all">Todos os riscos</option>
            <option value="high">Alto</option>
            <option value="medium">Medio</option>
            <option value="low">Baixo</option>
          </select>
          <select
            value={sortBy}
            onChange={(event) => {
              setPage(1);
              setSortBy(event.target.value as typeof sortBy);
            }}
            className="px-3 py-2 rounded-lg bg-surface-container-highest outline-none"
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
            value={sortOrder}
            onChange={(event) => {
              setPage(1);
              setSortOrder(event.target.value as 'asc' | 'desc');
            }}
            className="px-3 py-2 rounded-lg bg-surface-container-highest outline-none"
          >
            <option value="desc">Ordem decrescente</option>
            <option value="asc">Ordem crescente</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm">
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

      {data.items.length === 0 ? (
        <EmptyState message="Nenhum contrato encontrado para os filtros selecionados." />
      ) : (
        <section className="bg-surface-container-low rounded-xl p-4 overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="text-left text-on-surface-variant uppercase tracking-widest text-[10px]">
                <th className="py-3">Contrato</th>
                <th className="py-3">Fornecedor</th>
                <th className="py-3">Categoria</th>
                <th className="py-3">Valor mensal</th>
                <th className="py-3">Inicio</th>
                <th className="py-3">Fim</th>
                <th className="py-3">Indice</th>
                <th className="py-3">Prox. reajuste</th>
                <th className="py-3">Status</th>
                <th className="py-3">Risco</th>
                <th className="py-3">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} className="border-t border-outline-variant/20">
                  <td className="py-3">
                    <p className="font-bold">{item.contractNumber}</p>
                    <p className="text-xs text-on-surface-variant">{item.name}</p>
                  </td>
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
                    <div className="flex flex-wrap gap-1">
                      <button onClick={() => navigate(`/contracts/${item.id}`)} className="px-2 py-1 rounded bg-surface-container-highest text-xs font-bold">
                        Ver
                      </button>
                      <button onClick={() => navigate(`/contracts/${item.id}/editar`)} className="px-2 py-1 rounded bg-surface-container-highest text-xs font-bold">
                        Editar
                      </button>
                      <button
                        onClick={() => void doRenew(item)}
                        disabled={runningActionId === item.id}
                        className="px-2 py-1 rounded bg-primary text-on-primary text-xs font-bold disabled:opacity-50"
                      >
                        Renovar
                      </button>
                      <button
                        onClick={() => void doClose(item)}
                        disabled={runningActionId === item.id}
                        className="px-2 py-1 rounded bg-error text-white text-xs font-bold disabled:opacity-50"
                      >
                        Encerrar
                      </button>
                      <button
                        onClick={() => navigate(`/contracts/documentos?contractId=${encodeURIComponent(item.id)}`)}
                        className="px-2 py-1 rounded bg-surface-container-highest text-xs font-bold"
                      >
                        Anexar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-on-surface-variant">
              Pagina {data.meta.page} de {data.meta.totalPages} | Total: {data.meta.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={!data.meta.hasPrevious}
                className="px-3 py-2 rounded bg-surface-container-highest text-xs font-bold disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((current) => current + 1)}
                disabled={!data.meta.hasNext}
                className="px-3 py-2 rounded bg-primary text-on-primary text-xs font-bold disabled:opacity-50"
              >
                Proxima
              </button>
            </div>
          </div>
        </section>
      )}
    </ContractsPageShell>
  );
}
