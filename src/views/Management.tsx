import { useEffect, useMemo, useState } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blockFilter, setBlockFilter] = useState<'all' | 'A' | 'B' | 'C'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | UnitStatus>('all');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const response = await fetchManagementData();
        if (active) {
          setUnits(response.units);
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
  }, []);

  const filteredUnits = useMemo(() => {
    return units.filter((unit) => {
      const matchBlock = blockFilter === 'all' || unit.block === blockFilter;
      const matchStatus = statusFilter === 'all' || unit.status === statusFilter;
      return matchBlock && matchStatus;
    });
  }, [blockFilter, statusFilter, units]);

  const stats = useMemo(() => {
    return {
      occupied: units.filter((unit) => unit.status === 'occupied').length,
      maintenance: units.filter((unit) => unit.status === 'maintenance').length,
      vacant: units.filter((unit) => unit.status === 'vacant').length,
    };
  }, [units]);

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
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Unidades ocupadas</p>
          <h3 className="text-2xl md:text-3xl font-headline font-extrabold mt-2">{stats.occupied}</h3>
        </div>
        <div className="bg-surface-container-highest p-6 rounded-xl">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Em manutencao</p>
          <h3 className="text-2xl md:text-3xl font-headline font-extrabold mt-2">{stats.maintenance}</h3>
        </div>
        <div className="bg-surface-container-highest p-6 rounded-xl">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Vagas</p>
          <h3 className="text-2xl md:text-3xl font-headline font-extrabold mt-2">{stats.vacant}</h3>
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        <button onClick={() => setBlockFilter('all')} className="px-4 py-2 rounded-full text-xs font-bold bg-primary text-on-primary">
          Todos os blocos
        </button>
        <button onClick={() => setBlockFilter('A')} className="px-4 py-2 rounded-full text-xs font-bold bg-surface-container-highest">
          Bloco A
        </button>
        <button onClick={() => setBlockFilter('B')} className="px-4 py-2 rounded-full text-xs font-bold bg-surface-container-highest">
          Bloco B
        </button>
        <button onClick={() => setBlockFilter('C')} className="px-4 py-2 rounded-full text-xs font-bold bg-surface-container-highest">
          Bloco C
        </button>
      </section>

      <section className="flex flex-wrap gap-2">
        <button onClick={() => setStatusFilter('all')} className="px-4 py-2 rounded-full text-xs font-bold bg-primary text-on-primary">
          Todos os status
        </button>
        <button onClick={() => setStatusFilter('occupied')} className="px-4 py-2 rounded-full text-xs font-bold bg-surface-container-highest">
          Ocupadas
        </button>
        <button onClick={() => setStatusFilter('maintenance')} className="px-4 py-2 rounded-full text-xs font-bold bg-surface-container-highest">
          Manutencao
        </button>
        <button onClick={() => setStatusFilter('vacant')} className="px-4 py-2 rounded-full text-xs font-bold bg-surface-container-highest">
          Vagas
        </button>
      </section>

      {filteredUnits.length === 0 ? (
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
              {filteredUnits.map((unit) => (
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
        </section>
      )}
    </div>
  );
}
