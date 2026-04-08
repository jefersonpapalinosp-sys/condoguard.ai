import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
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

function normalizeText(value: unknown, fallback: string) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const raw = value.trim();
  if (!raw || raw === '[object Object]' || raw.includes('oracledb.AsyncLOB object at')) {
    return fallback;
  }

  return raw;
}

type SeriesKey = 'energia' | 'agua' | 'gas';

const SERIES: Array<{ key: SeriesKey; label: string; unit: string; color: string; gradientId: string }> = [
  { key: 'energia', label: 'Energia', unit: 'kWh', color: '#4AE176', gradientId: 'gradEnergia' },
  { key: 'agua', label: 'Agua', unit: 'm³', color: '#38bdf8', gradientId: 'gradAgua' },
  { key: 'gas', label: 'Gas', unit: 'kg', color: '#fb923c', gradientId: 'gradGas' },
];

function MiniAreaChart({
  data,
  dataKey,
  color,
  gradientId,
  unit,
}: {
  data: ConsumptionData['timeSeries'];
  dataKey: SeriesKey;
  color: string;
  gradientId: string;
  unit: string;
}) {
  if (!data || data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={42} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)' }}
          formatter={(value: number) => [`${value.toLocaleString('pt-BR')} ${unit}`, undefined]}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function Consumption() {
  const [data, setData] = useState<ConsumptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSeries, setActiveSeries] = useState<SeriesKey>('energia');

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

  const activeSerie = SERIES.find((s) => s.key === activeSeries)!;
  const hasTimeSeries = data.timeSeries && data.timeSeries.length > 0;

  // Last value for current display
  const lastPoint = data.timeSeries?.at(-1);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:space-y-8 md:p-8">
      {/* Hero */}
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

      {/* Time-series chart */}
      {hasTimeSeries && (
        <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 md:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-headline text-xl font-extrabold md:text-2xl">Tendencia de Consumo</h3>
            {/* Series selector tabs */}
            <div className="flex gap-1 rounded-xl bg-surface-container p-1 self-start">
              {SERIES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setActiveSeries(s.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    activeSeries === s.key
                      ? 'bg-primary-container text-white shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-headline font-extrabold" style={{ color: activeSerie.color }}>
              {lastPoint ? lastPoint[activeSeries].toLocaleString('pt-BR') : '—'}
            </span>
            <span className="text-sm text-on-surface-variant">{activeSerie.unit} · último mês</span>
          </div>

          <MiniAreaChart
            data={data.timeSeries}
            dataKey={activeSeries}
            color={activeSerie.color}
            gradientId={activeSerie.gradientId}
            unit={activeSerie.unit}
          />
        </section>
      )}

      {/* Anomalies */}
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
              <h4 className="mt-3 font-headline text-lg font-bold">{normalizeText(item.title, 'anomalia operacional')}</h4>
              <p className="mt-2 text-sm text-on-surface-variant">
                {normalizeText(item.description, 'Anomalia detectada automaticamente')}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
