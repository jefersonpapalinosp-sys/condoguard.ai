import { useEffect, useState } from 'react';
import { getConsumptionData, type ConsumptionData } from '../services/mockApi';
import { LoadingState } from '../shared/ui/states/LoadingState';
import { ErrorState } from '../shared/ui/states/ErrorState';
import { EmptyState } from '../shared/ui/states/EmptyState';

const anomalyStyle: Record<'critical' | 'warning' | 'info', string> = {
  critical: 'border-error',
  warning: 'border-secondary',
  info: 'border-on-primary-fixed-variant',
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
        const response = await getConsumptionData();
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
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <section>
        <h2 className="font-headline text-2xl md:text-4xl font-extrabold tracking-tight">Consumo e Telemetria</h2>
        <p className="text-on-surface-variant mt-2">Monitoramento operacional de energia, agua e gas.</p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-highest p-6 rounded-xl">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Unidades monitoradas</p>
          <h3 className="text-2xl md:text-3xl font-headline font-extrabold mt-2">{data.kpis.monitoredUnits}</h3>
        </div>
        <div className="bg-surface-container-highest p-6 rounded-xl">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Pico de carga</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{data.kpis.peakLoad}</h3>
        </div>
        <div className="bg-surface-container-highest p-6 rounded-xl">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Custo projetado</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{data.kpis.projectedCost}</h3>
        </div>
      </section>

      <section className="bg-surface-container-low rounded-xl p-4 md:p-8">
        <h3 className="font-headline text-2xl font-bold mb-6">Anomalias detectadas</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {data.anomalies.map((item) => (
            <article key={item.id} className={`bg-surface-container-lowest border-l-4 ${anomalyStyle[item.severity]} p-6 rounded-lg`}>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs uppercase tracking-widest text-on-surface-variant">{item.severity}</span>
                <span className="font-bold text-sm">{item.sigma}</span>
              </div>
              <h4 className="font-headline font-bold text-lg">{item.title}</h4>
              <p className="text-sm text-on-surface-variant mt-2">{item.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
