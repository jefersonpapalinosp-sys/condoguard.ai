import { useEffect, useState } from 'react';
import { fetchObservabilityMetrics, type ObservabilityMetricsResponse } from '../services/observabilityService';
import { DataSourceBadge } from '../shared/ui/DataSourceBadge';
import { ErrorState } from '../shared/ui/states/ErrorState';
import { LoadingState } from '../shared/ui/states/LoadingState';

export default function Observability() {
  const [data, setData] = useState<ObservabilityMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [routeLimit, setRouteLimit] = useState(10);
  const [codeLimit, setCodeLimit] = useState(10);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const response = await fetchObservabilityMetrics(routeLimit, codeLimit);
        if (active) {
          setData(response);
          setError(null);
        }
      } catch {
        if (active) {
          setError('Falha ao carregar metricas de observabilidade.');
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
  }, [codeLimit, reloadKey, routeLimit]);

  if (loading) {
    return <LoadingState message="Carregando observabilidade..." />;
  }

  if (error || !data) {
    return <ErrorState message={error || 'Falha ao carregar metricas de observabilidade.'} />;
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-headline text-2xl md:text-4xl font-extrabold tracking-tight">Observabilidade</h2>
          <p className="text-on-surface-variant mt-2">Metricas operacionais de API para acompanhamento de estabilidade.</p>
        </div>
        <DataSourceBadge module="observability" />
      </section>

      <section className="bg-surface-container-low rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <label className="text-sm text-on-surface-variant">
          Limite de rotas
          <select
            className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-on-surface"
            value={routeLimit}
            onChange={(event) => setRouteLimit(Number(event.target.value))}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </label>
        <label className="text-sm text-on-surface-variant">
          Limite de codigos
          <select
            className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-on-surface"
            value={codeLimit}
            onChange={(event) => setCodeLimit(Number(event.target.value))}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </label>
        <div className="text-sm text-on-surface-variant">
          Ultima coleta
          <p className="mt-1 text-on-surface font-semibold">{new Date(data.generatedAt).toLocaleString('pt-BR')}</p>
        </div>
        <button
          type="button"
          className="h-11 rounded-lg bg-primary text-on-primary font-semibold px-4"
          onClick={() => setReloadKey((current) => current + 1)}
        >
          Recarregar
        </button>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <article className="bg-surface-container-highest rounded-xl p-4">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Requests</p>
          <p className="text-2xl font-headline font-extrabold mt-2">{data.counters.totalRequests}</p>
        </article>
        <article className="bg-surface-container-highest rounded-xl p-4">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Erros</p>
          <p className="text-2xl font-headline font-extrabold mt-2">{data.counters.totalErrors}</p>
        </article>
        <article className="bg-surface-container-highest rounded-xl p-4">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Erro %</p>
          <p className="text-2xl font-headline font-extrabold mt-2">{data.counters.errorRatePct}%</p>
        </article>
        <article className="bg-surface-container-highest rounded-xl p-4">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">P95</p>
          <p className="text-2xl font-headline font-extrabold mt-2">{data.latency.p95Ms} ms</p>
        </article>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <article className="bg-surface-container-low rounded-xl p-5">
          <h3 className="font-headline text-xl font-bold mb-3">Top rotas</h3>
          <ul className="space-y-2">
            {data.topRoutes.map((route) => (
              <li key={route.route} className="text-sm flex items-center justify-between gap-3">
                <span className="font-semibold">{route.route}</span>
                <span className="text-on-surface-variant">
                  req: {route.requests} | err: {route.errors} | avg: {route.avgLatencyMs}ms
                </span>
              </li>
            ))}
          </ul>
        </article>

        <article className="bg-surface-container-low rounded-xl p-5">
          <h3 className="font-headline text-xl font-bold mb-3">Codigos de erro</h3>
          {data.errorCodes.length === 0 ? (
            <p className="text-sm text-on-surface-variant">Sem erros registrados.</p>
          ) : (
            <ul className="space-y-2">
              {data.errorCodes.map((item) => (
                <li key={item.code} className="text-sm flex items-center justify-between gap-3">
                  <span className="font-semibold">{item.code}</span>
                  <span className="text-on-surface-variant">{item.count}</span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </div>
  );
}
