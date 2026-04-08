import { useEffect, useState } from 'react';
import { fetchManagementData, updateUnitStatus } from '../services/managementService';
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

const statusLabelCompact: Record<UnitStatus, string> = {
  occupied: 'Ocupada',
  vacant: 'Vaga',
  maintenance: 'Manut.',
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
  const [updatingUnitId, setUpdatingUnitId] = useState<string | null>(null);
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

  async function rotateStatus(id: string) {
    const unit = units.find((u) => u.id === id);
    if (!unit || updatingUnitId === id) return;

    const newStatus = nextStatus(unit.status);

    // optimistic update
    setUnits((current) =>
      current.map((u) => (u.id === id ? { ...u, status: newStatus, lastUpdate: 'Agora' } : u)),
    );
    setUpdatingUnitId(id);

    try {
      const updated = await updateUnitStatus(id, newStatus);
      setUnits((current) => current.map((u) => (u.id === id ? { ...u, ...updated } : u)));
    } catch {
      // revert on failure
      setUnits((current) => current.map((u) => (u.id === id ? unit : u)));
    } finally {
      setUpdatingUnitId(null);
    }
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
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:space-y-8 md:p-8">
      <section className="rounded-3xl bg-[linear-gradient(136deg,#182420_0%,#254b42_64%,#2f6e63_100%)] p-5 text-white shadow-xl md:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/75">Gestao operacional</p>
            <h2 className="mt-2 font-headline text-2xl font-extrabold tracking-tight md:text-4xl">Centro de gestao</h2>
            <p className="mt-2 text-sm text-white/85 md:text-base">Acompanhamento de ocupacao, manutencao e pendencias por unidade.</p>
          </div>
          <DataSourceBadge module="management" />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <article className="rounded-2xl bg-white/12 px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-white/75">Ocupacao</p>
            <p className="mt-1 text-xl font-extrabold md:text-2xl">{indicators.occupancyRate}%</p>
            <p className="text-[11px] text-white/80">{indicators.occupiedCount} de {indicators.totalUnits}</p>
          </article>
          <article className="rounded-2xl bg-white/12 px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-white/75">Inadimplencia</p>
            <p className="mt-1 text-xl font-extrabold md:text-2xl">{indicators.delinquencyRate}%</p>
            <p className="text-[11px] text-white/80">{indicators.delinquencyUnits} unidades</p>
          </article>
          <article className="rounded-2xl bg-white/12 px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-white/75">Pendencias</p>
            <p className="mt-1 text-xl font-extrabold md:text-2xl">{indicators.pendingCount}</p>
            <p className="text-[11px] text-white/80">manutencoes e cadastros</p>
          </article>
        </div>
      </section>

      <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 md:p-5">
        <div className="flex flex-wrap gap-2">
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
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
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
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            placeholder="Buscar por bloco, unidade ou morador..."
            className="rounded-xl border border-outline-variant/30 bg-surface-container-highest px-4 py-3 text-sm outline-none"
          />
          <select
            value={sortBy}
            onChange={(event) => {
              setPage(1);
              setSortBy(event.target.value as 'block' | 'unit' | 'resident' | 'status' | 'lastUpdate');
            }}
            className="rounded-xl border border-outline-variant/30 bg-surface-container-highest px-4 py-3 text-sm outline-none"
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
            className="rounded-xl border border-outline-variant/30 bg-surface-container-highest px-4 py-3 text-sm outline-none"
          >
            <option value="asc">Ordem crescente</option>
            <option value="desc">Ordem decrescente</option>
          </select>
        </div>
      </section>

      <section className="space-y-3 md:hidden">
        {units.map((unit) => (
          <article key={unit.id} className="rounded-2xl border border-outline-variant/25 bg-surface-container-low p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Unidade</p>
                <h3 className="mt-1 font-headline text-lg font-bold">{unit.block}-{unit.unit}</h3>
                <p className="mt-1 text-sm text-on-surface-variant">{unit.resident}</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusClass[unit.status]}`}>
                {statusLabelCompact[unit.status]}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-surface-container-highest px-2.5 py-2">
                <p className="uppercase tracking-widest text-on-surface-variant">Ultima atualizacao</p>
                <p className="mt-1 font-semibold text-on-surface">{unit.lastUpdate}</p>
              </div>
              <button
                onClick={() => void rotateStatus(unit.id)}
                disabled={updatingUnitId === unit.id}
                className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-on-primary disabled:opacity-50"
              >
                {updatingUnitId === unit.id ? 'Atualizando...' : 'Alterar status'}
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="hidden overflow-x-auto rounded-2xl border border-outline-variant/30 bg-surface-container-low p-5 md:block">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant">
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
                  <span className={`rounded px-2 py-1 text-xs font-bold ${statusClass[unit.status]}`}>{statusLabel[unit.status]}</span>
                </td>
                <td className="py-4">{unit.lastUpdate}</td>
                <td className="py-4">
                  <button
                    onClick={() => void rotateStatus(unit.id)}
                    disabled={updatingUnitId === unit.id}
                    className="rounded bg-primary px-3 py-1.5 text-xs font-bold text-on-primary disabled:opacity-50"
                  >
                    {updatingUnitId === unit.id ? 'Atualizando...' : 'Alterar status'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold text-on-surface-variant">
            Pagina {meta.page} de {meta.totalPages} | Total: {meta.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={!meta.hasPrevious}
              className="rounded-lg bg-surface-container-highest px-3 py-2 text-xs font-bold disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((current) => current + 1)}
              disabled={!meta.hasNext}
              className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-on-primary disabled:opacity-50"
            >
              Proxima
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
