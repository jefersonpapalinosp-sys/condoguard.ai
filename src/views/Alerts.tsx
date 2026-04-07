import { useEffect, useState } from 'react';
import { fetchAlertsData, markAlertAsRead } from '../services/alertsService';
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
      </section>

      <section className="flex flex-wrap gap-2">
        <button className={statusFilterButtonClass('all')} onClick={() => { setPage(1); setStatusFilter('all'); }}>
          Todos estados
        </button>
        <button className={statusFilterButtonClass('active')} onClick={() => { setPage(1); setStatusFilter('active'); }}>
          Abertos
        </button>
        <button className={statusFilterButtonClass('read')} onClick={() => { setPage(1); setStatusFilter('read'); }}>
          Lidos
        </button>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
          placeholder="Buscar em titulo ou descricao..."
          className="bg-surface-container-highest rounded-xl px-4 py-3 text-sm outline-none border border-outline-variant/30"
        />
        <select
          value={sortBy}
          onChange={(event) => {
            setPage(1);
            setSortBy(event.target.value as 'severity' | 'title' | 'time' | 'status' | 'readAt');
          }}
          className="bg-surface-container-highest rounded-xl px-4 py-3 text-sm outline-none border border-outline-variant/30"
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
          className="bg-surface-container-highest rounded-xl px-4 py-3 text-sm outline-none border border-outline-variant/30"
        >
          <option value="asc">Ordem crescente</option>
          <option value="desc">Ordem decrescente</option>
        </select>
      </section>

      {data.items.length === 0 ? (
        <EmptyState message="Nenhum alerta encontrado para o filtro selecionado." />
      ) : (
        <section className="space-y-4">
          {data.items.map((item) => (
            <article key={item.id} className={`p-5 rounded-xl border-l-4 ${severityStyles[item.severity]}`}>
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold uppercase tracking-widest">{item.severity}</span>
                <span className="text-[10px] font-medium text-on-surface-variant">{item.time}</span>
              </div>
              <h3 className="font-headline font-bold text-lg mb-1">{normalizeText(item.title, 'anomalia detectada')}</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {normalizeText(item.description, 'Anomalia detectada automaticamente')}
              </p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-on-surface-variant">
                  Estado: {item.status === 'read' ? 'Lido' : 'Aberto'}
                </span>
                <button
                  onClick={() => void handleMarkRead(item.id)}
                  disabled={item.status === 'read' || markingId === item.id}
                  className="px-3 py-1.5 text-xs font-bold rounded bg-primary text-on-primary disabled:opacity-50"
                >
                  {item.status === 'read' ? 'Ja lido' : (markingId === item.id ? 'Salvando...' : 'Marcar como lido')}
                </button>
              </div>
            </article>
          ))}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-on-surface-variant">
              Pagina {meta.page} de {meta.totalPages} | Total: {meta.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={!meta.hasPrevious}
                className="px-3 py-2 text-xs font-bold rounded bg-surface-container-highest disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((current) => current + 1)}
                disabled={!meta.hasNext}
                className="px-3 py-2 text-xs font-bold rounded bg-primary text-on-primary disabled:opacity-50"
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
