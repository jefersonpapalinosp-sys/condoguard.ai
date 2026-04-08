import { useEffect, useState } from 'react';
import { fetchAlertsData, markAlertAsRead } from '../services/alertsService';
import type { AlertsData } from '../services/mockApi';
import { DataSourceBadge } from '../shared/ui/DataSourceBadge';
import { LoadingState } from '../shared/ui/states/LoadingState';
import { ErrorState } from '../shared/ui/states/ErrorState';
import { EmptyState } from '../shared/ui/states/EmptyState';

const severityStyles: Record<'critical' | 'warning' | 'info', string> = {
  critical: 'border-error/40 bg-error-container/25',
  warning: 'border-secondary/35 bg-secondary-container/30',
  info: 'border-on-primary-fixed-variant/35 bg-surface-container-highest',
};

const severityBadgeClass: Record<'critical' | 'warning' | 'info', string> = {
  critical: 'bg-error-container text-on-error-container',
  warning: 'bg-secondary-container text-on-secondary-container',
  info: 'bg-tertiary-fixed-dim/30 text-on-tertiary-fixed-variant',
};

const severityLabel: Record<'critical' | 'warning' | 'info', string> = {
  critical: 'Critico',
  warning: 'Aviso',
  info: 'Informativo',
};

function normalizeText(value: unknown, fallback: string) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const raw = value.trim();
  if (!raw || raw === '[object Object]') {
    return fallback;
  }

  return raw;
}

export default function Alerts() {
  const [data, setData] = useState<AlertsData | null>(null);
  const [meta, setMeta] = useState({
    page: 1,
    pageSize: 6,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'read'>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'severity' | 'title' | 'time' | 'status' | 'readAt'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [markingId, setMarkingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const response = await fetchAlertsData({
          page,
          pageSize: meta.pageSize,
          severity: activeFilter === 'all' ? undefined : activeFilter,
          status: statusFilter === 'all' ? undefined : statusFilter,
          search: search.trim() || undefined,
          sortBy,
          sortOrder,
        });
        if (active) {
          setData(response);
          setMeta(
            response.meta ?? {
              page: 1,
              pageSize: response.items.length || 6,
              total: response.items.length,
              totalPages: 1,
              hasNext: false,
              hasPrevious: false,
            },
          );
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
  }, [activeFilter, meta.pageSize, page, search, sortBy, sortOrder, statusFilter]);

  async function handleMarkRead(alertId: string) {
    try {
      setMarkingId(alertId);
      await markAlertAsRead(alertId);
      setData((current) => {
        if (!current) {
          return current;
        }
        return {
          ...current,
          activeCount: Math.max(0, current.activeCount - 1),
          items: current.items.map((item) => (
            item.id === alertId
              ? {
                ...item,
                status: 'read',
                read: true,
                readAt: new Date().toISOString(),
              }
              : item
          )),
        };
      });
    } catch {
      setError('Falha ao marcar alerta como lido.');
    } finally {
      setMarkingId(null);
    }
  }

  if (loading) {
    return <LoadingState message="Carregando alertas em tempo real..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!data) {
    return <EmptyState />;
  }

  function filterButtonClass(filterValue: 'all' | 'critical' | 'warning' | 'info') {
    return `px-4 py-2 rounded-full text-xs font-bold transition-colors ${
      activeFilter === filterValue ? 'bg-primary text-on-primary' : 'bg-surface-container-highest hover:bg-surface-container-high'
    }`;
  }

  function statusFilterButtonClass(filterValue: 'all' | 'active' | 'read') {
    return `px-4 py-2 rounded-full text-xs font-bold transition-colors ${
      statusFilter === filterValue ? 'bg-primary text-on-primary' : 'bg-surface-container-highest hover:bg-surface-container-high'
    }`;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <header className="rounded-3xl bg-[linear-gradient(140deg,#131b2e_0%,#253a63_70%,#3b5489_100%)] p-5 text-white shadow-xl md:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/75">Monitoramento residencial</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight font-headline md:text-3xl">Central de alertas</h2>
            <p className="mt-2 text-sm text-white/85 md:text-base">Eventos criticos, operacionais e informativos em uma fila unica.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DataSourceBadge module="alerts" />
            <span className="rounded-full bg-white/12 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white/90">
              {data.activeCount} alertas ativos
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <article className="rounded-2xl bg-white/12 px-3 py-3">
            <p className="text-[10px] uppercase tracking-widest text-white/75">Ativos</p>
            <p className="mt-1 text-xl font-extrabold">{data.items.filter((item) => item.status !== 'read').length}</p>
          </article>
          <article className="rounded-2xl bg-white/12 px-3 py-3">
            <p className="text-[10px] uppercase tracking-widest text-white/75">Criticos</p>
            <p className="mt-1 text-xl font-extrabold">{data.items.filter((item) => item.severity === 'critical').length}</p>
          </article>
          <article className="rounded-2xl bg-white/12 px-3 py-3">
            <p className="text-[10px] uppercase tracking-widest text-white/75">Avisos</p>
            <p className="mt-1 text-xl font-extrabold">{data.items.filter((item) => item.severity === 'warning').length}</p>
          </article>
          <article className="rounded-2xl bg-white/12 px-3 py-3">
            <p className="text-[10px] uppercase tracking-widest text-white/75">Informativos</p>
            <p className="mt-1 text-xl font-extrabold">{data.items.filter((item) => item.severity === 'info').length}</p>
          </article>
        </div>
      </header>

      <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 md:p-5">
        <div className="flex flex-wrap gap-2">
          <button className={filterButtonClass('all')} onClick={() => { setPage(1); setActiveFilter('all'); }}>
            Todos
          </button>
          <button className={filterButtonClass('critical')} onClick={() => { setPage(1); setActiveFilter('critical'); }}>
            Critico
          </button>
          <button className={filterButtonClass('warning')} onClick={() => { setPage(1); setActiveFilter('warning'); }}>
            Aviso
          </button>
          <button className={filterButtonClass('info')} onClick={() => { setPage(1); setActiveFilter('info'); }}>
            Informativo
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button className={statusFilterButtonClass('all')} onClick={() => { setPage(1); setStatusFilter('all'); }}>
            Todos estados
          </button>
          <button className={statusFilterButtonClass('active')} onClick={() => { setPage(1); setStatusFilter('active'); }}>
            Abertos
          </button>
          <button className={statusFilterButtonClass('read')} onClick={() => { setPage(1); setStatusFilter('read'); }}>
            Lidos
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            placeholder="Buscar em titulo ou descricao..."
            className="rounded-xl border border-outline-variant/30 bg-surface-container-highest px-4 py-3 text-sm outline-none"
          />
          <select
            value={sortBy}
            onChange={(event) => {
              setPage(1);
              setSortBy(event.target.value as 'severity' | 'title' | 'time' | 'status' | 'readAt');
            }}
            className="rounded-xl border border-outline-variant/30 bg-surface-container-highest px-4 py-3 text-sm outline-none"
          >
            <option value="time">Ordenar por tempo</option>
            <option value="title">Ordenar por titulo</option>
            <option value="severity">Ordenar por severidade</option>
            <option value="status">Ordenar por estado</option>
            <option value="readAt">Ordenar por leitura</option>
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

      {data.items.length === 0 ? (
        <EmptyState message="Nenhum alerta encontrado para o filtro selecionado." />
      ) : (
        <section className="space-y-4">
          {data.items.map((item) => (
            <article key={item.id} className={`rounded-2xl border p-4 shadow-[0_1px_0_rgba(19,27,46,0.04)] ${severityStyles[item.severity]}`}>
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${severityBadgeClass[item.severity]}`}>
                  {severityLabel[item.severity]}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">{item.time}</span>
              </div>

              <h3 className="mb-1 font-headline text-lg font-bold">{normalizeText(item.title, 'anomalia detectada')}</h3>
              <p className="text-sm leading-relaxed text-on-surface-variant">
                {normalizeText(item.description, 'Anomalia detectada automaticamente')}
              </p>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-full bg-surface-container-low px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                  Estado: {item.status === 'read' ? 'Lido' : 'Aberto'}
                </span>
                <button
                  onClick={() => void handleMarkRead(item.id)}
                  disabled={item.status === 'read' || markingId === item.id}
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-on-primary disabled:opacity-50"
                >
                  {item.status === 'read' ? 'Ja lido' : (markingId === item.id ? 'Salvando...' : 'Marcar como lido')}
                </button>
              </div>
            </article>
          ))}

          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3">
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
      )}
    </div>
  );
}
