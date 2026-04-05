import { useEffect, useMemo, useState } from 'react';
import { exportInvoicesCsv, fetchInvoicesData, markInvoiceAsPaid } from '../services/invoicesService';
import type { InvoiceItem, InvoiceStatus } from '../services/mockApi';
import { DataSourceBadge } from '../shared/ui/DataSourceBadge';
import { EmptyState } from '../shared/ui/states/EmptyState';
import { ErrorState } from '../shared/ui/states/ErrorState';
import { LoadingState } from '../shared/ui/states/LoadingState';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const statusLabel: Record<InvoiceStatus, string> = {
  pending: 'Pendente',
  paid: 'Paga',
  overdue: 'Vencida',
};

const statusClass: Record<InvoiceStatus, string> = {
  pending: 'bg-surface-container-highest text-on-surface-variant',
  paid: 'bg-tertiary-fixed-dim/30 text-on-tertiary-fixed-variant',
  overdue: 'bg-error-container text-on-error-container',
};

export default function Invoices() {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [filter, setFilter] = useState<'all' | InvoiceStatus>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'dueDate' | 'amount' | 'unit' | 'resident' | 'reference' | 'status'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    page: 1,
    pageSize: 8,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const response = await fetchInvoicesData({
          page,
          pageSize: meta.pageSize,
          status: filter === 'all' ? undefined : filter,
          search: search.trim() || undefined,
          sortBy,
          sortOrder,
        });
        if (active) {
          setInvoices(response.items);
          setMeta(
            response.meta ?? {
              page: 1,
              pageSize: response.items.length || 8,
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
          setError('Falha ao carregar faturas.');
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
  }, [filter, meta.pageSize, page, reloadKey, search, sortBy, sortOrder]);

  const totalsOnPage = useMemo(() => {
    return invoices.reduce(
      (acc, invoice) => {
        acc.total += invoice.amount;
        if (invoice.status === 'pending') {
          acc.pending += invoice.amount;
        }
        if (invoice.status === 'overdue') {
          acc.overdue += invoice.amount;
        }
        return acc;
      },
      { total: 0, pending: 0, overdue: 0 },
    );
  }, [invoices]);

  async function registerPayment(id: string) {
    try {
      setPayingId(id);
      await markInvoiceAsPaid(id);
      setReloadKey((current) => current + 1);
      setError(null);
    } catch {
      setError('Falha ao registrar pagamento da fatura.');
    } finally {
      setPayingId(null);
    }
  }

  async function handleExportCsv() {
    try {
      setExporting(true);
      const csvBlob = await exportInvoicesCsv({
        status: filter === 'all' ? undefined : filter,
        search: search.trim() || undefined,
        sortBy,
        sortOrder,
      });
      const url = URL.createObjectURL(csvBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `faturas-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Falha ao exportar CSV de faturas.');
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return <LoadingState message="Carregando modulo de faturas..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (invoices.length === 0) {
    return <EmptyState message="Nenhuma fatura disponivel." />;
  }

  function filterButtonClass(filterValue: 'all' | InvoiceStatus) {
    return `px-4 py-2 rounded-full text-xs font-bold transition-colors ${
      filter === filterValue ? 'bg-primary text-on-primary' : 'bg-surface-container-highest hover:bg-surface-container-high'
    }`;
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-headline text-2xl md:text-4xl font-extrabold tracking-tight">Faturas</h2>
          <p className="text-on-surface-variant mt-2">Acompanhe cobrancas por unidade e registre pagamentos.</p>
        </div>
        <div className="flex items-center gap-2">
          <DataSourceBadge module="invoices" />
          <button
            onClick={() => void handleExportCsv()}
            disabled={exporting}
            className="px-4 py-2 text-xs font-bold rounded bg-primary text-on-primary disabled:opacity-50"
          >
            {exporting ? 'Exportando...' : 'Exportar CSV'}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-highest p-6 rounded-xl">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Total da pagina</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{currency.format(totalsOnPage.total)}</h3>
        </div>
        <div className="bg-surface-container-highest p-6 rounded-xl">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Pendentes (pagina)</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{currency.format(totalsOnPage.pending)}</h3>
        </div>
        <div className="bg-surface-container-highest p-6 rounded-xl">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Vencidas (pagina)</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{currency.format(totalsOnPage.overdue)}</h3>
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        <button onClick={() => setFilter('all')} className={filterButtonClass('all')}>
          Todas
        </button>
        <button onClick={() => setFilter('pending')} className={filterButtonClass('pending')}>
          Pendentes
        </button>
        <button onClick={() => setFilter('overdue')} className={filterButtonClass('overdue')}>
          Vencidas
        </button>
        <button onClick={() => setFilter('paid')} className={filterButtonClass('paid')}>
          Pagas
        </button>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
          placeholder="Buscar por unidade, morador ou referencia..."
          className="bg-surface-container-highest rounded-xl px-4 py-3 text-sm outline-none border border-outline-variant/30"
        />
        <select
          value={sortBy}
          onChange={(event) => {
            setPage(1);
            setSortBy(event.target.value as 'dueDate' | 'amount' | 'unit' | 'resident' | 'reference' | 'status');
          }}
          className="bg-surface-container-highest rounded-xl px-4 py-3 text-sm outline-none border border-outline-variant/30"
        >
          <option value="dueDate">Ordenar por vencimento</option>
          <option value="amount">Ordenar por valor</option>
          <option value="unit">Ordenar por unidade</option>
          <option value="resident">Ordenar por morador</option>
          <option value="reference">Ordenar por referencia</option>
          <option value="status">Ordenar por status</option>
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

      {invoices.length === 0 ? (
        <EmptyState message="Nenhuma fatura para o filtro selecionado." />
      ) : (
        <section className="bg-surface-container-low rounded-xl p-6 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-on-surface-variant uppercase tracking-widest text-[10px]">
                <th className="py-3">Unidade</th>
                <th className="py-3">Morador</th>
                <th className="py-3">Referencia</th>
                <th className="py-3">Vencimento</th>
                <th className="py-3">Valor</th>
                <th className="py-3">Status</th>
                <th className="py-3">Acao</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-t border-outline-variant/20">
                  <td className="py-4 font-bold">{invoice.unit}</td>
                  <td className="py-4">{invoice.resident}</td>
                  <td className="py-4">{invoice.reference}</td>
                  <td className="py-4">{invoice.dueDate}</td>
                  <td className="py-4">{currency.format(invoice.amount)}</td>
                  <td className="py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${statusClass[invoice.status]}`}>{statusLabel[invoice.status]}</span>
                  </td>
                  <td className="py-4">
                    {invoice.status === 'paid' ? (
                      <span className="text-xs text-on-surface-variant">Quitada</span>
                    ) : (
                      <button
                        onClick={() => void registerPayment(invoice.id)}
                        disabled={payingId === invoice.id}
                        className="px-3 py-1.5 text-xs font-bold rounded bg-primary text-on-primary disabled:opacity-50"
                      >
                        {payingId === invoice.id ? 'Salvando...' : 'Registrar pagamento'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
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
