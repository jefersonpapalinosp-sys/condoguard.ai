import { useEffect, useState } from 'react';
import { fetchConsumptionData } from '../services/consumptionService';
import type { ConsumptionData } from '../services/mockApi';
import { DataSourceBadge } from '../shared/ui/DataSourceBadge';
import { LoadingState } from '../shared/ui/states/LoadingState';
import { ErrorState } from '../shared/ui/states/ErrorState';
import { EmptyState } from '../shared/ui/states/EmptyState';

const anomalyStyle: Record<'critical' | 'warning' | 'info', string> = {
  critical: 'border-error/45 bg-error-container/20',
  warning: 'border-secondary/40 bg-secondary-container/25',
  info: 'border-on-primary-fixed-variant/35 bg-surface-container-highest',
};

const anomalyTagClass: Record<'critical' | 'warning' | 'info', string> = {
  critical: 'bg-error-container text-on-error-container',
  warning: 'bg-secondary-container text-on-secondary-container',
  info: 'bg-tertiary-fixed-dim/30 text-on-tertiary-fixed-variant',
};

const anomalyLabel: Record<'critical' | 'warning' | 'info', string> = {
  critical: 'Critico',
  warning: 'Aviso',
  info: 'Informativo',
};

export default function Consumption() {
  const [data, setData] = useState<ConsumptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const response = await fetchConsumptionData();
        if (active) {
          setData(response);
          setError(null);
        }
      } catch {
        if (active) {
          setError('Falha ao carregar dados de consumo.');
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
    return <LoadingState message="Carregando telemetria de consumo..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!data) {
    return <EmptyState message="Sem dados de consumo para o periodo." />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:space-y-8 md:p-8">
      <section className="rounded-3xl bg-[linear-gradient(140deg,#072340_0%,#0f4364_58%,#186f8f_100%)] p-5 text-white shadow-xl md:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/75">Consumo inteligente</p>
            <h2 className="mt-2 font-headline text-2xl font-extrabold tracking-tight md:text-4xl">Consumo e Telemetria</h2>
            <p className="mt-2 text-sm text-white/85 md:text-base">Monitoramento de energia, agua e gas com leitura de desvios para acao rapida.</p>
          </div>
          <DataSourceBadge module="consumption" />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <article className="rounded-2xl bg-white/12 px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-white/75">Unidades monitoradas</p>
            <p className="mt-1 text-2xl font-extrabold">{data.kpis.monitoredUnits}</p>
          </article>
          <article className="rounded-2xl bg-white/12 px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-white/75">Pico de carga</p>
            <p className="mt-1 text-lg font-bold">{data.kpis.peakLoad}</p>
          </article>
          <article className="rounded-2xl bg-white/12 px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-white/75">Custo projetado</p>
            <p className="mt-1 text-lg font-bold">{data.kpis.projectedCost}</p>
          </article>
        </div>
      </section>

      <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-headline text-xl font-extrabold md:text-2xl">Anomalias detectadas</h3>
          <span className="rounded-full bg-surface-container-high px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
            {data.anomalies.length} ocorrencias
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {data.anomalies.map((item) => (
            <article key={item.id} className={`rounded-2xl border p-4 ${anomalyStyle[item.severity]}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${anomalyTagClass[item.severity]}`}>
                  {anomalyLabel[item.severity]}
                </span>
                <span className="rounded-full bg-surface-container-low px-2 py-1 text-[11px] font-bold text-on-surface-variant">{item.sigma}</span>
              </div>
              <h4 className="mt-3 font-headline text-lg font-bold">{item.title}</h4>
              <p className="mt-2 text-sm text-on-surface-variant">{item.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
