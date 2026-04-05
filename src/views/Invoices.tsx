import { useEffect, useMemo, useState } from 'react';
import { fetchInvoicesData } from '../services/invoicesService';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const response = await fetchInvoicesData();
        if (active) {
          setInvoices(response.items);
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
  }, []);

  const filteredInvoices = useMemo(() => {
    if (filter === 'all') {
      return invoices;
    }

    return invoices.filter((invoice) => invoice.status === filter);
  }, [filter, invoices]);

  const totals = useMemo(() => {
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

  function registerPayment(id: string) {
    setInvoices((current) =>
      current.map((invoice) => {
        if (invoice.id !== id) {
          return invoice;
        }
        return { ...invoice, status: 'paid' };
      }),
    );
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
        <DataSourceBadge module="invoices" />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-highest p-6 rounded-xl">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Total do ciclo</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{currency.format(totals.total)}</h3>
        </div>
        <div className="bg-surface-container-highest p-6 rounded-xl">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Pendentes</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{currency.format(totals.pending)}</h3>
        </div>
        <div className="bg-surface-container-highest p-6 rounded-xl">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Vencidas</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{currency.format(totals.overdue)}</h3>
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

      {filteredInvoices.length === 0 ? (
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
              {filteredInvoices.map((invoice) => (
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
                        onClick={() => registerPayment(invoice.id)}
                        className="px-3 py-1.5 text-xs font-bold rounded bg-primary text-on-primary"
                      >
                        Registrar pagamento
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
