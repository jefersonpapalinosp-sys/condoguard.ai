import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { fetchDashboardData } from '../services/dashboardService';
import type { DashboardData } from '../services/mockApi';
import { DataSourceBadge } from '../shared/ui/DataSourceBadge';
import { LoadingState } from '../shared/ui/states/LoadingState';
import { ErrorState } from '../shared/ui/states/ErrorState';
import { EmptyState } from '../shared/ui/states/EmptyState';

const levelClass: Record<'critical' | 'warning' | 'info', string> = {
  critical: 'bg-error',
  warning: 'bg-secondary',
  info: 'bg-on-tertiary-container',
};

export default function Dashboard() {
  const location = useLocation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const forbiddenByRole = Boolean((location.state as { forbidden?: boolean } | null)?.forbidden);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const response = await fetchDashboardData();
        if (active) {
          setData(response);
          setError(null);
        }
      } catch {
        if (active) {
          setError('Falha ao carregar indicadores do dashboard.');
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

  if (loading) {
    return <LoadingState message="Carregando indicadores do condominio..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!data) {
    return <EmptyState />;
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="font-headline text-2xl md:text-4xl font-extrabold tracking-tighter text-on-surface">Dashboard</h3>
            <p className="text-on-surface-variant font-body mt-2">Visao geral da inteligencia predial e performance operacional.</p>
          </div>
          <DataSourceBadge module="dashboard" />
        </div>
      </section>

      {forbiddenByRole ? (
        <section className="rounded-xl border border-amber-300/60 bg-amber-100/80 px-4 py-3 text-amber-900">
          <p className="text-sm font-semibold">Acesso restrito por perfil</p>
          <p className="text-xs mt-1">Seu perfil atual nao possui permissao para o modulo solicitado.</p>
        </section>
      ) : null}

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface-container-highest p-6 rounded-xl">
          <p className="text-on-surface-variant text-xs uppercase tracking-widest">Alertas ativos</p>
          <h4 className="text-2xl md:text-3xl font-headline font-extrabold mt-2">{data.metrics.activeAlerts}</h4>
        </div>
        <div className="bg-surface-container-highest p-6 rounded-xl">
          <p className="text-on-surface-variant text-xs uppercase tracking-widest">Economia mensal</p>
          <h4 className="text-2xl md:text-3xl font-headline font-extrabold mt-2">{data.metrics.monthlySavings}</h4>
        </div>
        <div className="bg-surface-container-highest p-6 rounded-xl">
          <p className="text-on-surface-variant text-xs uppercase tracking-widest">Consumo atual</p>
          <h4 className="text-2xl md:text-3xl font-headline font-extrabold mt-2">{data.metrics.currentConsumption}</h4>
        </div>
        <div className="bg-surface-container-highest p-6 rounded-xl">
          <p className="text-on-surface-variant text-xs uppercase tracking-widest">Contratos pendentes</p>
          <h4 className="text-2xl md:text-3xl font-headline font-extrabold mt-2">{data.metrics.pendingContracts}</h4>
        </div>
      </section>

      <section className="bg-surface-container-low rounded-xl p-4 md:p-8">
        <h5 className="text-xl font-headline font-extrabold tracking-tight mb-6">Alertas recentes</h5>
        <div className="space-y-4">
          {data.recentAlerts.map((alert) => (
            <article key={alert.id} className="flex gap-4 items-start p-4 bg-surface-container-lowest rounded-lg">
              <div className={`mt-1 w-2 h-2 rounded-full ${levelClass[alert.level]}`} />
              <div className="flex-1">
                <div className="flex justify-between items-start gap-4">
                  <p className="text-sm font-bold">{alert.title}</p>
                  <span className="text-[10px] text-on-surface-variant font-medium">{alert.time}</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">{alert.subtitle}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
