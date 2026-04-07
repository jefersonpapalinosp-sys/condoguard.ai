import { useEffect, useState } from 'react';
import { fetchManagementData } from '../services/managementService';
import type { ManagementUnit, UnitStatus } from '../services/mockApi';
import { DataSourceBadge } from '../shared/ui/DataSourceBadge';
import { EmptyState } from '../shared/ui/states/EmptyState';
import { ErrorState } from '../shared/ui/states/ErrorState';
import { LoadingState } from '../shared/ui/states/LoadingState';

const statusLabel: Record<UnitStatus, string> = {
  occupied: 'Ocupada',
  vacant: 'Vaga',
  maintenance: 'Manutencao',
};

const statusClass: Record<UnitStatus, string> = {
  occupied: 'bg-tertiary-fixed-dim/30 text-on-tertiary-fixed-variant',
  vacant: 'bg-surface-container-highest text-on-surface-variant',
  maintenance: 'bg-error-container text-on-error-container',
};

function nextStatus(status: UnitStatus): UnitStatus {
  if (status === 'occupied') {
    return 'maintenance';
  }
  if (status === 'maintenance') {
    return 'vacant';
  }
  return 'occupied';
}

export default function Management() {
  const [units, setUnits] = useState<ManagementUnit[]>([]);
  const [indicators, setIndicators] = useState({
    occupancyRate: 0,
    occupiedCount: 0,
    totalUnits: 0,
    delinquencyRate: 0,
    delinquencyUnits: 0,
    pendingCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blockFilter, setBlockFilter] = useState<'all' | 'A' | 'B' | 'C'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | UnitStatus>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'block' | 'unit' | 'resident' | 'status' | 'lastUpdate'>('unit');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    page: 1,
    pageSize: 8,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const response = await fetchManagementData({
          page,
          pageSize: meta.pageSize,
          block: blockFilter === 'all' ? undefined : blockFilter,
          status: statusFilter === 'all' ? undefined : statusFilter,
          search: search.trim() || undefined,
          sortBy,
          sortOrder,
        });
        if (active) {
          setUnits(response.units);
          setIndicators({
            occupancyRate: response.indicators?.occupancy?.occupancyRate ?? 0,
            occupiedCount: response.indicators?.occupancy?.occupiedCount ?? 0,
            totalUnits: response.indicators?.occupancy?.totalUnits ?? response.units.length,
            delinquencyRate: response.indicators?.delinquency?.delinquencyRate ?? 0,
            delinquencyUnits: response.indicators?.delinquency?.delinquencyUnits ?? 0,
            pendingCount: response.indicators?.pending?.pendingCount ?? 0,
          });
          setMeta(
            response.meta ?? {
              page: 1,
              pageSize: response.units.length || 8,
              total: response.units.length,
              totalPages: 1,
              hasNext: false,
              hasPrevious: false,
            },
          );
          setError(null);
        }
      } catch {
        if (active) {
          setError('Falha ao carregar dados de gestao.');
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
  }, [blockFilter, meta.pageSize, page, search, sortBy, sortOrder, statusFilter]);

  function rotateStatus(id: string) {
    setUnits((current) =>
      current.map((unit) => {
        if (unit.id !== id) {
          return unit;
        }
        return {
          ...unit,
          status: nextStatus(unit.status),
          lastUpdate: 'Agora',
        };
      }),
    );
  }

  if (loading) {
    return <LoadingState message="Carregando centro de gestao..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (units.length === 0) {
    return <EmptyState message="Nenhuma unidade cadastrada." />;
  }

  function blockFilterClass(filterValue: 'all' | 'A' | 'B' | 'C') {
    return `px-4 py-2 rounded-full text-xs font-bold transition-colors ${
      blockFilter === filterValue ? 'bg-primary text-on-primary' : 'bg-surface-container-highest hover:bg-surface-container-high'
    }`;
  }

  function statusFilterClass(filterValue: 'all' | UnitStatus) {
    return `px-4 py-2 rounded-full text-xs font-bold transition-colors ${
      statusFilter === filterValue ? 'bg-primary text-on-primary' : 'bg-surface-container-highest hover:bg-surface-container-high'
    }`;
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-headline text-2xl md:text-4xl font-extrabold tracking-tight">Centro de gestao</h2>
          <p className="text-on-surface-variant mt-2">Visao de unidades, ocupacao e manutencao em tempo real.</p>
        </div>
        <DataSourceBadge module="management" />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-highest p-6 rounded-xl">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Ocupacao</p>
          <h3 className="text-2xl md:text-3xl font-headline font-extrabold mt-2">{indicators.occupancyRate}%</h3>
          <p className="text-xs text-on-surface-variant mt-1">
            {indicators.occupiedCount} ocupadas de {indicators.totalUnits}
          </p>
        </div>
        <div className="bg-surface-container-highest p-6 rounded-xl">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Inadimplencia</p>
          <h3 className="text-2xl md:text-3xl font-headline font-extrabold mt-2">{indicators.delinquencyRate}%</h3>
          <p className="text-xs text-on-surface-variant mt-1">
            {indicators.delinquencyUnits} unidades inadimplentes
          </p>
        </div>
        <div className="bg-surface-container-highest p-6 rounded-xl">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Pendencias</p>
          <h3 className="text-2xl md:text-3xl font-headline font-extrabold mt-2">{indicators.pendingCount}</h3>
          <p className="text-xs text-on-surface-variant mt-1">Manutencoes + cadastros pendentes</p>
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        <button onClick={() => { setPage(1); setBlockFilter('all'); }} className={blockFilterClass('all')}>
          Todos os blocos
        </button>
        <button onClick={() => { setPage(1); setBlockFilter('A'); }} className={blockFilterClass('A')}>
          Bloco A
        </button>
        <button onClick={() => { setPage(1); setBlockFilter('B'); }} className={blockFilterClass('B')}>
          Bloco B
        </button>
        <button onClick={() => { setPage(1); setBlockFilter('C'); }} className={blockFilterClass('C')}>
          Bloco C
        </button>
      </section>

      <section className="flex flex-wrap gap-2">
        <button onClick={() => { setPage(1); setStatusFilter('all'); }} className={statusFilterClass('all')}>
          Todos os status
        </button>
        <button onClick={() => { setPage(1); setStatusFilter('occupied'); }} className={statusFilterClass('occupied')}>
          Ocupadas
        </button>
        <button onClick={() => { setPage(1); setStatusFilter('maintenance'); }} className={statusFilterClass('maintenance')}>
          Manutencao
        </button>
        <button onClick={() => { setPage(1); setStatusFilter('vacant'); }} className={statusFilterClass('vacant')}>
          Vagas
        </button>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
          placeholder="Buscar por bloco, unidade ou morador..."
          className="bg-surface-container-highest rounded-xl px-4 py-3 text-sm outline-none border border-outline-variant/30"
        />
        <select
          value={sortBy}
          onChange={(event) => {
            setPage(1);
            setSortBy(event.target.value as 'block' | 'unit' | 'resident' | 'status' | 'lastUpdate');
          }}
          className="bg-surface-container-highest rounded-xl px-4 py-3 text-sm outline-none border border-outline-variant/30"
        >
          <option value="unit">Ordenar por unidade</option>
          <option value="block">Ordenar por bloco</option>
          <option value="resident">Ordenar por morador</option>
          <option value="status">Ordenar por status</option>
          <option value="lastUpdate">Ordenar por atualizacao</option>
        </select>
        <select
          value={sortOrder}
          onChange={(event) => {
            setPage(1);
            setSortOrder(event.target.value as 'asc' | 'desc');
          }}
          className="bg-surface-container-highest rounded-xl px-4 py-3 text-sm outline-none border border-outline-variant/30"
        >
          <option value="asc">Ordem crescente</option>
          <option value="desc">Ordem decrescente</option>
        </select>
      </section>

      {units.length === 0 ? (
        <EmptyState message="Nenhuma unidade encontrada para os filtros selecionados." />
      ) : (
        <section className="bg-surface-container-low rounded-xl p-6 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-on-surface-variant uppercase tracking-widest text-[10px]">
                <th className="py-3">Bloco/Unidade</th>
                <th className="py-3">Morador</th>
                <th className="py-3">Status</th>
                <th className="py-3">Atualizacao</th>
                <th className="py-3">Acao</th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <tr key={unit.id} className="border-t border-outline-variant/20">
                  <td className="py-4 font-bold">{unit.block}-{unit.unit}</td>
                  <td className="py-4">{unit.resident}</td>
                  <td className="py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${statusClass[unit.status]}`}>{statusLabel[unit.status]}</span>
                  </td>
                  <td className="py-4">{unit.lastUpdate}</td>
                  <td className="py-4">
                    <button onClick={() => rotateStatus(unit.id)} className="px-3 py-1.5 text-xs font-bold rounded bg-primary text-on-primary">
                      Alterar status
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-on-surface-variant">
              Pagina {meta.page} de {meta.totalPages} | Total: {meta.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={!meta.hasPrevious}
                className="px-3 py-2 text-xs font-bold rounded bg-surface-container-highest disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((current) => current + 1)}
                disabled={!meta.hasNext}
                className="px-3 py-2 text-xs font-bold rounded bg-primary text-on-primary disabled:opacity-50"
              >
                Proxima
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
