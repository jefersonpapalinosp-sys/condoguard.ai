import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { fetchDashboardData } from '../services/dashboardService';
import type { DashboardData, DashboardSparklines } from '../services/mockApi';
import { DataSourceBadge } from '../shared/ui/DataSourceBadge';
import { LoadingState } from '../shared/ui/states/LoadingState';
import { ErrorState } from '../shared/ui/states/ErrorState';
import { EmptyState } from '../shared/ui/states/EmptyState';

const levelClass: Record<'critical' | 'warning' | 'info', string> = {
  critical: 'bg-error',
  warning: 'bg-secondary',
  info: 'bg-on-tertiary-container',
};

const levelTagClass: Record<'critical' | 'warning' | 'info', string> = {
  critical: 'bg-error-container text-on-error-container',
  warning: 'bg-secondary-container text-on-secondary-container',
  info: 'bg-tertiary-fixed-dim/30 text-on-tertiary-fixed-variant',
};

const levelLabel: Record<'critical' | 'warning' | 'info', string> = {
  critical: 'Critico',
  warning: 'Atencao',
  info: 'Informativo',
};

type SparklineKey = keyof DashboardSparklines;

function Sparkline({ values, color = '#4AE176' }: { values: number[]; color?: string }) {
  if (!values || values.length < 2) return null;
  const data = values.map((v) => ({ v }));
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

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

  const quickActions = [
    { to: '/alerts', label: 'Ver alertas', icon: 'warning' },
    { to: '/consumption', label: 'Acompanhar consumo', icon: 'query_stats' },
    { to: '/chat', label: 'Abrir copiloto', icon: 'forum' },
  ];

  const metricCards: Array<{
    id: string;
    label: string;
    value: string | number;
    icon: string;
    hint: string;
    sparklineKey: SparklineKey;
    sparkColor: string;
  }> = [
    {
      id: 'active-alerts',
      label: 'Alertas ativos',
      value: data.metrics.activeAlerts,
      icon: 'notifications_active',
      hint: 'Requer atencao imediata',
      sparklineKey: 'activeAlerts',
      sparkColor: '#f87171',
    },
    {
      id: 'savings',
      label: 'Economia mensal',
      value: data.metrics.monthlySavings,
      icon: 'savings',
      hint: 'Comparativo com media historica',
      sparklineKey: 'monthlySavings',
      sparkColor: '#4AE176',
    },
    {
      id: 'consumption',
      label: 'Consumo atual',
      value: data.metrics.currentConsumption,
      icon: 'bolt',
      hint: 'Atualizado em tempo real',
      sparklineKey: 'currentConsumption',
      sparkColor: '#38bdf8',
    },
    {
      id: 'contracts',
      label: 'Contratos pendentes',
      value: data.metrics.pendingContracts,
      icon: 'description',
      hint: 'Acompanhamento administrativo',
      sparklineKey: 'pendingContracts',
      sparkColor: '#fb923c',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:space-y-8 md:p-8">
      <section className="rounded-3xl bg-[linear-gradient(132deg,#131b2e_0%,#1d2d4e_58%,#344d7f_100%)] p-5 text-white shadow-xl md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/75">Painel do morador</p>
            <h3 className="mt-2 font-headline text-2xl font-extrabold tracking-tight md:text-4xl">Dashboard</h3>
            <p className="mt-3 text-sm text-white/85 md:text-base">
              Visao consolidada do condominio para decidir rapido: alertas, consumo e indicadores de economia.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start rounded-full bg-white/10 px-3 py-1.5">
            <span className="material-symbols-outlined text-[16px]">wifi</span>
            <DataSourceBadge module="dashboard" />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="flex items-center justify-between rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold transition-colors hover:bg-white/20"
            >
              <span>{action.label}</span>
              <span className="material-symbols-outlined text-[18px]">{action.icon}</span>
            </Link>
          ))}
        </div>
      </section>

      {forbiddenByRole ? (
        <section className="rounded-2xl border border-amber-300/70 bg-amber-100/85 px-4 py-3 text-amber-900">
          <p className="text-sm font-semibold">Acesso restrito por perfil</p>
          <p className="text-xs mt-1">Seu perfil atual nao possui permissao para o modulo solicitado.</p>
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((card) => {
          const sparkValues = data.sparklines?.[card.sparklineKey];
          return (
            <article key={card.id} className="rounded-2xl border border-outline-variant/35 bg-surface-container-highest p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-on-surface-variant">{card.label}</p>
                  <h4 className="mt-2 text-2xl font-headline font-extrabold tracking-tight md:text-3xl">{card.value}</h4>
                </div>
                <span className="material-symbols-outlined rounded-xl bg-surface-container-low px-2 py-2 text-on-surface-variant shrink-0">
                  {card.icon}
                </span>
              </div>
              {sparkValues && (
                <div className="mt-3 -mx-1">
                  <Sparkline values={sparkValues} color={card.sparkColor} />
                </div>
              )}
              <p className="mt-1 text-xs text-on-surface-variant">{card.hint}</p>
            </article>
          );
        })}
      </section>

      <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h5 className="font-headline text-xl font-extrabold tracking-tight">Alertas recentes</h5>
          <Link
            to="/alerts"
            className="inline-flex items-center gap-2 rounded-full bg-surface-container-high px-3 py-1.5 text-xs font-bold uppercase tracking-wider"
          >
            Ver todos
            <span className="material-symbols-outlined text-[16px]">north_east</span>
          </Link>
        </div>

        <div className="space-y-3">
          {data.recentAlerts.map((alert) => (
            <article
              key={alert.id}
              className="rounded-2xl border border-outline-variant/25 bg-surface-container-lowest p-4 shadow-[0_1px_0_rgba(19,27,46,0.03)]"
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1 h-2.5 w-2.5 rounded-full ${levelClass[alert.level]}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-on-surface">{alert.title}</p>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${levelTagClass[alert.level]}`}>
                      {levelLabel[alert.level]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-on-surface-variant">{alert.subtitle}</p>
                  <p className="mt-2 text-[11px] uppercase tracking-widest text-on-surface-variant">{alert.time}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
