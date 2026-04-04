import { useEffect, useMemo, useState } from 'react';
import { fetchAlertsData } from '../services/alertsService';
import type { AlertsData } from '../services/mockApi';
import { DataSourceBadge } from '../shared/ui/DataSourceBadge';
import { LoadingState } from '../shared/ui/states/LoadingState';
import { ErrorState } from '../shared/ui/states/ErrorState';
import { EmptyState } from '../shared/ui/states/EmptyState';

const severityStyles: Record<'critical' | 'warning' | 'info', string> = {
  critical: 'bg-error-container/30 border-error text-error',
  warning: 'bg-surface-container-highest border-secondary text-secondary',
  info: 'bg-surface-container-low border-on-primary-fixed-variant text-on-primary-fixed-variant',
};

export default function Alerts() {
  const [data, setData] = useState<AlertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const response = await fetchAlertsData();
        if (active) {
          setData(response);
          setError(null);
        }
      } catch {
        if (active) {
          setError('Falha ao carregar alertas.');
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

  const filteredItems = useMemo(() => {
    if (!data) {
      return [];
    }

    if (activeFilter === 'all') {
      return data.items;
    }

    return data.items.filter((item) => item.severity === activeFilter);
  }, [activeFilter, data]);

  if (loading) {
    return <LoadingState message="Carregando alertas em tempo real..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!data) {
    return <EmptyState />;
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight font-headline">Central de alertas</h2>
          <p className="text-on-surface-variant mt-2">Monitoramento de eventos criticos e operacionais.</p>
        </div>
        <div className="flex items-center gap-2">
          <DataSourceBadge module="alerts" />
          <span className="text-xs font-bold px-3 py-2 bg-surface-container-highest rounded text-on-surface-variant">
            {data.activeCount} alertas ativos
          </span>
        </div>
      </header>

      <section className="flex flex-wrap gap-2">
        <button className="px-4 py-2 rounded-full text-xs font-bold bg-primary text-on-primary" onClick={() => setActiveFilter('all')}>
          Todos
        </button>
        <button className="px-4 py-2 rounded-full text-xs font-bold bg-surface-container-highest" onClick={() => setActiveFilter('critical')}>
          Critico
        </button>
        <button className="px-4 py-2 rounded-full text-xs font-bold bg-surface-container-highest" onClick={() => setActiveFilter('warning')}>
          Aviso
        </button>
        <button className="px-4 py-2 rounded-full text-xs font-bold bg-surface-container-highest" onClick={() => setActiveFilter('info')}>
          Informativo
        </button>
      </section>

      {filteredItems.length === 0 ? (
        <EmptyState message="Nenhum alerta encontrado para o filtro selecionado." />
      ) : (
        <section className="space-y-4">
          {filteredItems.map((item) => (
            <article key={item.id} className={`p-5 rounded-xl border-l-4 ${severityStyles[item.severity]}`}>
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold uppercase tracking-widest">{item.severity}</span>
                <span className="text-[10px] font-medium text-on-surface-variant">{item.time}</span>
              </div>
              <h3 className="font-headline font-bold text-lg mb-1">{item.title}</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">{item.description}</p>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
