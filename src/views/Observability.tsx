import { useEffect, useRef, useState } from 'react';
import { fetchObservabilityMetrics, type ObservabilityMetricsResponse } from '../services/observabilityService';
import { DataSourceBadge } from '../shared/ui/DataSourceBadge';
import { ErrorState } from '../shared/ui/states/ErrorState';
import { LoadingState } from '../shared/ui/states/LoadingState';

const limitOptions = [5, 10, 20, 30];
const knownHttpMethods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']);

type StatusClassKey = keyof ObservabilityMetricsResponse['statusClasses'];
type HealthTone = 'stable' | 'attention' | 'critical';

const statusClassMeta: Record<StatusClassKey, { label: string; barClass: string }> = {
  '2xx': { label: '2xx - Sucesso', barClass: 'bg-tertiary-fixed-dim/70' },
  '3xx': { label: '3xx - Redirecionamento', barClass: 'bg-secondary-container' },
  '4xx': { label: '4xx - Cliente', barClass: 'bg-error-container/80' },
  '5xx': { label: '5xx - Servidor', barClass: 'bg-error' },
  other: { label: 'Outros', barClass: 'bg-surface-container-high' },
};

const healthToneMeta: Record<HealthTone, { label: string; className: string; hint: string }> = {
  stable: {
    label: 'Operacao estavel',
    className: 'bg-tertiary-fixed-dim/30 text-on-tertiary-fixed-variant',
    hint: 'Taxa de erro e latencia dentro do esperado.',
  },
  attention: {
    label: 'Atencao',
    className: 'bg-secondary-container text-on-secondary-container',
    hint: 'Monitore picos de latencia e aumentos de falha.',
  },
  critical: {
    label: 'Critico',
    className: 'bg-error-container text-on-error-container',
    hint: 'Necessario investigar degradacao da API.',
  },
};

const traceInvestigationSteps = [
  {
    title: 'Capture o trace da resposta',
    description: 'Use o header X-Trace-Id ou o campo traceId retornado nos erros para identificar a requisicao exata.',
  },
  {
    title: 'Cruze com auditoria e logs',
    description: 'Consulte os logs estruturados e, quando aplicavel, o endpoint /api/security/audit filtrando o tenant autenticado.',
  },
  {
    title: 'Valide o tipo de falha',
    description: 'Correlacione o trace com codigos como INVALID_TOKEN, FORBIDDEN e eventos auditaveis de bloqueio cross-tenant.',
  },
];

function formatMilliseconds(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const precision = safeValue >= 100 ? 0 : safeValue >= 10 ? 1 : 2;
  return `${safeValue.toFixed(precision)} ms`;
}

function formatPercent(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  if (Number.isInteger(safeValue)) {
    return `${safeValue}%`;
  }
  return `${safeValue.toFixed(2)}%`;
}

function formatUptime(startedAt: string, generatedAt: string) {
  const start = new Date(startedAt).getTime();
  const end = new Date(generatedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return '0m';
  }

  const diff = end - start;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function methodClass(method: string) {
  switch (method) {
    case 'GET':
      return 'bg-tertiary-fixed-dim/30 text-on-tertiary-fixed-variant';
    case 'POST':
      return 'bg-primary-fixed/40 text-on-primary-fixed-variant';
    case 'PUT':
    case 'PATCH':
      return 'bg-secondary-container text-on-secondary-container';
    case 'DELETE':
      return 'bg-error-container text-on-error-container';
    case 'OPTIONS':
    case 'HEAD':
      return 'bg-surface-container-high text-on-surface-variant';
    default:
      return 'bg-surface-container-highest text-on-surface-variant';
  }
}

export default function Observability() {
  const [data, setData] = useState<ObservabilityMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeLimit, setRouteLimit] = useState(10);
  const [codeLimit, setCodeLimit] = useState(10);
  const [reloadKey, setReloadKey] = useState(0);
  const hasLoadedOnceRef = useRef(false);

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
        const response = await fetchObservabilityMetrics(routeLimit, codeLimit);
        if (active) {
          setData(response);
          setError(null);
          hasLoadedOnceRef.current = true;
        }
      } catch {
        if (active) {
          setError(isRefreshing ? 'Falha ao atualizar metricas de observabilidade.' : 'Falha ao carregar metricas de observabilidade.');
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
  }, [codeLimit, reloadKey, routeLimit]);

  if (loading && !data) {
    return <LoadingState message="Carregando observabilidade..." />;
  }

  if (!data) {
    return <ErrorState message={error || 'Falha ao carregar metricas de observabilidade.'} />;
  }

  const statusEntries = Object.entries(data.statusClasses) as Array<[StatusClassKey, number]>;
  const totalStatusSamples = statusEntries.reduce((acc, [, count]) => acc + count, 0);
  const generatedAtLabel = new Date(data.generatedAt).toLocaleString('pt-BR');
  const startedAtLabel = new Date(data.startedAt).toLocaleString('pt-BR');
  const uptimeLabel = formatUptime(data.startedAt, data.generatedAt);
  const maxRouteRequests = Math.max(1, ...data.topRoutes.map((route) => route.requests));
  const maxRouteLatency = Math.max(1, ...data.topRoutes.map((route) => route.avgLatencyMs));
  const maxErrorCodeCount = Math.max(1, ...data.errorCodes.map((item) => item.count));
  const maxLatencyValue = Math.max(1, data.latency.avgMs, data.latency.p95Ms, data.latency.maxMs);

  const routeRows = data.topRoutes.map((route) => {
    const parts = route.route.trim().split(/\s+/);
    const rawMethod = parts[0] ?? 'ROUTE';
    const hasHttpMethod = knownHttpMethods.has(rawMethod);
    const method = hasHttpMethod ? rawMethod : 'ROUTE';
    const path = hasHttpMethod ? parts.slice(1).join(' ') || '/' : route.route;

    return {
      ...route,
      method,
      path,
      requestShare: Math.max(6, (route.requests / maxRouteRequests) * 100),
      latencyShare: Math.max(6, (route.avgLatencyMs / maxRouteLatency) * 100),
    };
  });

  const healthTone: HealthTone =
    data.counters.errorRatePct >= 5 || data.latency.p95Ms >= 1200
      ? 'critical'
      : data.counters.errorRatePct >= 1 || data.latency.p95Ms >= 500
        ? 'attention'
        : 'stable';

  const latencyProfile = [
    { label: 'Media', value: data.latency.avgMs, className: 'bg-primary' },
    { label: 'P95', value: data.latency.p95Ms, className: 'bg-secondary' },
    { label: 'Maximo', value: data.latency.maxMs, className: 'bg-error' },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:space-y-8 md:p-8">
      <section className="relative overflow-hidden rounded-3xl border border-outline-variant/25 bg-[linear-gradient(130deg,#101b33_0%,#15325a_55%,#24507c_100%)] p-5 text-white shadow-xl md:p-7">
        <div className="pointer-events-none absolute -right-16 -top-14 h-64 w-64 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-16 left-1/4 h-56 w-56 rounded-full bg-cyan-200/15 blur-3xl" aria-hidden="true" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/75">Observability center</p>
            <h2 className="mt-2 font-headline text-2xl font-extrabold tracking-tight md:text-4xl">Observabilidade</h2>
            <p className="mt-2 text-sm text-white/85 md:text-base">Painel de estabilidade da API com visao de latencia, erro e concentracao de trafego por rota.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${healthToneMeta[healthTone].className}`}>
              {healthToneMeta[healthTone].label}
            </span>
            <DataSourceBadge module="observability" />
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-widest text-white/75">Ultima coleta</p>
            <p className="mt-1 text-sm font-semibold">{generatedAtLabel}</p>
          </article>
          <article className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-widest text-white/75">Servico ativo desde</p>
            <p className="mt-1 text-sm font-semibold">{startedAtLabel}</p>
          </article>
          <article className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-widest text-white/75">Uptime monitorado</p>
            <p className="mt-1 text-sm font-semibold">{uptimeLabel}</p>
          </article>
          <article className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-widest text-white/75">Amostras de latencia</p>
            <p className="mt-1 text-sm font-semibold">{data.latency.samples}</p>
          </article>
        </div>
      </section>

      <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 md:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <label className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-on-surface-variant">Limite de rotas</span>
            <select
              className="interactive-focus w-full rounded-xl border border-outline-variant/35 bg-surface-container-highest px-3 py-2.5 text-sm text-on-surface outline-none transition-colors"
              value={routeLimit}
              onChange={(event) => setRouteLimit(Number(event.target.value))}
            >
              {limitOptions.map((item) => (
                <option key={`route-${item}`} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-on-surface-variant">Limite de codigos</span>
            <select
              className="interactive-focus w-full rounded-xl border border-outline-variant/35 bg-surface-container-highest px-3 py-2.5 text-sm text-on-surface outline-none transition-colors"
              value={codeLimit}
              onChange={(event) => setCodeLimit(Number(event.target.value))}
            >
              {limitOptions.map((item) => (
                <option key={`code-${item}`} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-highest px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-widest text-on-surface-variant">Sinal operacional</p>
            <p className="mt-1 text-sm font-semibold text-on-surface">{healthToneMeta[healthTone].hint}</p>
          </div>

          <button
            type="button"
            className="interactive-focus h-11 rounded-xl monolith-gradient px-4 text-sm font-bold text-on-primary disabled:opacity-60"
            onClick={() => setReloadKey((current) => current + 1)}
            disabled={refreshing}
          >
            {refreshing ? 'Atualizando...' : 'Recarregar'}
          </button>
        </div>
      </section>

      {error ? (
        <p className="rounded-xl border border-error/30 bg-error-container/40 px-3 py-2 text-xs font-semibold text-on-error-container" role="status" aria-live="polite">
          {error}
        </p>
      ) : null}
      {refreshing ? (
        <p className="rounded-xl border border-primary-fixed/40 bg-primary-fixed/25 px-3 py-2 text-xs font-semibold text-on-surface-variant" aria-live="polite">
          Atualizando metricas de observabilidade...
        </p>
      ) : null}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr,0.95fr]">
        <article className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Troubleshooting</p>
              <h3 className="mt-2 font-headline text-xl font-extrabold">Correlacao por trace ID</h3>
            </div>
            <span className="rounded-full bg-primary-fixed/35 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-on-primary-fixed-variant">
              Contrato ativo
            </span>
          </div>

          <p className="mt-3 text-sm leading-6 text-on-surface-variant">
            Cada erro relevante da API retorna um <span className="font-semibold text-on-surface">traceId</span> no payload e espelha o mesmo valor no
            header <span className="font-semibold text-on-surface">X-Trace-Id</span>. Isso permite acompanhar a mesma chamada entre cliente, backend e
            trilha de auditoria.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {traceInvestigationSteps.map((step, index) => (
              <article key={step.title} className="rounded-2xl border border-outline-variant/25 bg-surface-container-highest px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Passo {index + 1}</p>
                <h4 className="mt-2 text-sm font-bold text-on-surface">{step.title}</h4>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">{step.description}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Sinais operacionais</p>
          <h3 className="mt-2 font-headline text-xl font-extrabold">Checklist rapido</h3>

          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-highest px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Erro protegido</p>
              <p className="mt-1 text-sm text-on-surface">Confirme se a resposta trouxe <span className="font-semibold">traceId</span> e header <span className="font-semibold">X-Trace-Id</span>.</p>
            </div>
            <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-highest px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Tenant isolation</p>
              <p className="mt-1 text-sm text-on-surface">Tentativas cross-tenant devem manter <span className="font-semibold">404</span> para o cliente e evento auditavel interno.</p>
            </div>
            <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-highest px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Runbook</p>
              <p className="mt-1 text-sm text-on-surface">Use o smoke da Sprint 11 para validar autenticacao, RBAC, tenancy e correlacao ponta a ponta.</p>
            </div>
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <article className="hover-lift rounded-2xl bg-primary-container p-4 text-white">
          <p className="text-[10px] uppercase tracking-widest text-white/75">Requests</p>
          <p className="mt-2 text-2xl font-headline font-extrabold">{data.counters.totalRequests}</p>
        </article>
        <article className="hover-lift rounded-2xl border border-outline-variant/25 bg-surface-container-highest p-4">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Erros</p>
          <p className="mt-2 text-2xl font-headline font-extrabold">{data.counters.totalErrors}</p>
        </article>
        <article className="hover-lift rounded-2xl border border-outline-variant/25 bg-surface-container-highest p-4">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Erro %</p>
          <p className="mt-2 text-2xl font-headline font-extrabold">{formatPercent(data.counters.errorRatePct)}</p>
        </article>
        <article className="hover-lift rounded-2xl border border-outline-variant/25 bg-surface-container-highest p-4">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">P95</p>
          <p className="mt-2 text-2xl font-headline font-extrabold">{formatMilliseconds(data.latency.p95Ms)}</p>
        </article>
        <article className="hover-lift rounded-2xl border border-outline-variant/25 bg-surface-container-highest p-4">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Latencia media</p>
          <p className="mt-2 text-2xl font-headline font-extrabold">{formatMilliseconds(data.latency.avgMs)}</p>
        </article>
        <article className="hover-lift rounded-2xl border border-outline-variant/25 bg-surface-container-highest p-4">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Pico maximo</p>
          <p className="mt-2 text-2xl font-headline font-extrabold">{formatMilliseconds(data.latency.maxMs)}</p>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <article className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-5 xl:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h3 className="font-headline text-xl font-extrabold">Top rotas</h3>
            <p className="text-xs uppercase tracking-widest text-on-surface-variant">
              {routeRows.length} rotas com maior carga
            </p>
          </div>

          {routeRows.length === 0 ? (
            <p className="mt-4 text-sm text-on-surface-variant">Sem dados de rota na janela atual.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {routeRows.map((route) => (
                <li key={route.route} className="rounded-xl border border-outline-variant/20 bg-surface-container-highest px-3 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${methodClass(route.method)}`}>{route.method}</span>
                        <p className="truncate font-semibold text-on-surface">{route.path}</p>
                      </div>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        req: {route.requests} | err: {route.errors}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-on-surface">{formatMilliseconds(route.avgLatencyMs)}</p>
                      <p className="text-xs text-on-surface-variant">max {formatMilliseconds(route.maxLatencyMs)}</p>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-high">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${route.requestShare}%` }} />
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-high">
                      <div className="h-full rounded-full bg-secondary" style={{ width: `${route.latencyShare}%` }} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-5">
          <h3 className="font-headline text-xl font-extrabold">Distribuicao HTTP</h3>
          <p className="mt-1 text-xs text-on-surface-variant">
            {totalStatusSamples} respostas monitoradas
          </p>
          <div className="mt-4 space-y-2.5">
            {statusEntries.map(([key, count]) => {
              const pct = totalStatusSamples > 0 ? (count / totalStatusSamples) * 100 : 0;
              return (
                <div key={key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-on-surface">{statusClassMeta[key].label}</span>
                    <span className="text-on-surface-variant">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
                    <div className={`h-full rounded-full ${statusClassMeta[key].barClass}`} style={{ width: `${Math.max(5, pct)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-5">
          <h3 className="font-headline text-xl font-extrabold">Codigos de erro</h3>
          {data.errorCodes.length === 0 ? (
            <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-outline-variant/25 bg-surface-container-highest/65 p-6 text-center">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/60" aria-hidden="true">verified</span>
              <p className="mt-2 font-semibold text-on-surface">Sem erros registrados</p>
              <p className="mt-1 text-xs text-on-surface-variant">Nenhum codigo de erro coletado na janela atual.</p>
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {data.errorCodes.map((item) => (
                <li key={item.code} className="rounded-xl border border-outline-variant/20 bg-surface-container-highest px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-on-surface">{item.code}</span>
                    <span className="text-sm font-bold text-on-surface">{item.count}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container-high">
                    <div className="h-full rounded-full bg-error/85" style={{ width: `${Math.max(8, (item.count / maxErrorCodeCount) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-5">
          <h3 className="font-headline text-xl font-extrabold">Perfil de latencia</h3>
          <p className="mt-1 text-xs text-on-surface-variant">Comparativo entre media, p95 e pico maximo.</p>

          <div className="mt-4 space-y-3">
            {latencyProfile.map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-on-surface">{item.label}</span>
                  <span className="text-on-surface-variant">{formatMilliseconds(item.value)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
                  <div className={`h-full rounded-full ${item.className}`} style={{ width: `${Math.max(6, (item.value / maxLatencyValue) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-surface-container-highest px-3 py-2">
              <p className="uppercase tracking-widest text-on-surface-variant">Amostras</p>
              <p className="mt-1 text-sm font-bold text-on-surface">{data.latency.samples}</p>
            </div>
            <div className="rounded-lg bg-surface-container-highest px-3 py-2">
              <p className="uppercase tracking-widest text-on-surface-variant">Uptime</p>
              <p className="mt-1 text-sm font-bold text-on-surface">{uptimeLabel}</p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
