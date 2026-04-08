import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createInvoiceData, exportInvoicesCsv, fetchInvoicesData, markInvoiceAsPaid, updateInvoiceData, type InvoiceCreatePayload } from '../services/invoicesService';
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

const statusLabelMobile: Record<InvoiceStatus, string> = {
  pending: 'Pendente',
  paid: 'Quitada',
  overdue: 'Vencida',
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
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceItem | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const form = new FormData(event.currentTarget);
    const payload: InvoiceCreatePayload = {
      unit: String(form.get('unit') || '').trim(),
      resident: String(form.get('resident') || '').trim() || undefined,
      reference: String(form.get('reference') || '').trim() || undefined,
      dueDate: String(form.get('dueDate') || '').trim(),
      amount: parseFloat(String(form.get('amount') || '0')),
      status: String(form.get('status') || 'pending') as InvoiceStatus,
    };

    if (!payload.unit || !payload.dueDate || !payload.amount) {
      setFormError('Unidade, vencimento e valor sao obrigatorios.');
      return;
    }

    try {
      setFormSaving(true);
      if (editingInvoice) {
        await updateInvoiceData(editingInvoice.id, payload);
      } else {
        await createInvoiceData(payload);
      }
      setShowForm(false);
      setEditingInvoice(null);
      setReloadKey((k) => k + 1);
    } catch {
      setFormError(editingInvoice ? 'Nao foi possivel editar a fatura.' : 'Nao foi possivel criar a fatura.');
    } finally {
      setFormSaving(false);
    }
  }

  function openCreate() {
    setEditingInvoice(null);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(invoice: InvoiceItem) {
    setEditingInvoice(invoice);
    setFormError(null);
    setShowForm(true);
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
    return `rounded-full px-4 py-2 text-xs font-bold transition-colors ${
      filter === filterValue ? 'bg-primary text-on-primary' : 'bg-surface-container-highest hover:bg-surface-container-high'
    }`;
  }

  const invoiceModal = showForm ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <section className="w-full max-w-lg rounded-2xl bg-surface-container-low p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="font-headline text-lg font-bold">
            {editingInvoice ? 'Editar fatura' : 'Nova fatura'}
          </h4>
          <button
            type="button"
            onClick={() => { setShowForm(false); setEditingInvoice(null); setFormError(null); }}
            className="rounded-lg bg-surface-container-highest px-3 py-1.5 text-xs font-bold"
          >
            Fechar
          </button>
        </div>

        <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleFormSubmit}>
          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Unidade *
            <input name="unit" required maxLength={30} defaultValue={editingInvoice?.unit ?? ''}
              placeholder="Ex.: A-101"
              className="mt-2 w-full rounded-lg border border-outline-variant/30 bg-surface-container-highest px-3 py-2 outline-none focus:ring-2 focus:ring-primary-fixed" />
          </label>

          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Morador
            <input name="resident" maxLength={180} defaultValue={editingInvoice?.resident ?? ''}
              placeholder="Nome do morador"
              className="mt-2 w-full rounded-lg border border-outline-variant/30 bg-surface-container-highest px-3 py-2 outline-none focus:ring-2 focus:ring-primary-fixed" />
          </label>

          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Referencia
            <input name="reference" maxLength={20} defaultValue={editingInvoice?.reference ?? ''}
              placeholder="Ex.: Abr/2026"
              className="mt-2 w-full rounded-lg border border-outline-variant/30 bg-surface-container-highest px-3 py-2 outline-none focus:ring-2 focus:ring-primary-fixed" />
          </label>

          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Status
            <select name="status" defaultValue={editingInvoice?.status ?? 'pending'}
              className="mt-2 w-full rounded-lg border border-outline-variant/30 bg-surface-container-highest px-3 py-2">
              <option value="pending">Pendente</option>
              <option value="overdue">Vencida</option>
              <option value="paid">Paga</option>
            </select>
          </label>

          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Vencimento *
            <input name="dueDate" type="date" required defaultValue={editingInvoice?.dueDate ?? ''}
              className="mt-2 w-full rounded-lg border border-outline-variant/30 bg-surface-container-highest px-3 py-2 outline-none focus:ring-2 focus:ring-primary-fixed" />
          </label>

          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Valor (R$) *
            <input name="amount" type="number" step="0.01" min="0.01" required
              defaultValue={editingInvoice?.amount ?? ''}
              placeholder="0,00"
              className="mt-2 w-full rounded-lg border border-outline-variant/30 bg-surface-container-highest px-3 py-2 outline-none focus:ring-2 focus:ring-primary-fixed" />
          </label>

          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={formSaving}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase tracking-widest text-on-primary disabled:opacity-50">
              {formSaving ? 'Salvando...' : editingInvoice ? 'Salvar alteracoes' : 'Criar fatura'}
            </button>
            <button type="button"
              onClick={() => { setShowForm(false); setEditingInvoice(null); setFormError(null); }}
              className="rounded-lg bg-surface-container-highest px-4 py-2 text-xs font-bold uppercase tracking-widest text-on-surface">
              Cancelar
            </button>
            {formError ? <span className="text-xs text-error">{formError}</span> : null}
          </div>
        </form>
      </section>
    </div>
  ) : null;

  return (
    <>
    {invoiceModal}
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:space-y-8 md:p-8">
      <section className="rounded-3xl bg-[linear-gradient(132deg,#162132_0%,#21375a_58%,#2f4f82_100%)] p-5 text-white shadow-xl md:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/75">Operacao administrativa</p>
            <h2 className="mt-2 font-headline text-2xl font-extrabold tracking-tight md:text-4xl">Faturas</h2>
            <p className="mt-2 text-sm text-white/85 md:text-base">
              Controle financeiro por unidade com filtros operacionais e registro rapido de pagamento.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <DataSourceBadge module="invoices" />
            <button
              onClick={openCreate}
              className="rounded-lg bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-white/20"
            >
              Nova Fatura
            </button>
            <button
              onClick={() => void handleExportCsv()}
              disabled={exporting}
              className="rounded-lg bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-white/20 disabled:opacity-50"
            >
              {exporting ? 'Exportando...' : 'Exportar CSV'}
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <article className="rounded-2xl bg-white/12 px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-white/75">Total na pagina</p>
            <p className="mt-1 text-xl font-extrabold md:text-2xl">{currency.format(totalsOnPage.total)}</p>
          </article>
          <article className="rounded-2xl bg-white/12 px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-white/75">Pendentes</p>
            <p className="mt-1 text-xl font-extrabold md:text-2xl">{currency.format(totalsOnPage.pending)}</p>
          </article>
          <article className="rounded-2xl bg-white/12 px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-white/75">Vencidas</p>
            <p className="mt-1 text-xl font-extrabold md:text-2xl">{currency.format(totalsOnPage.overdue)}</p>
          </article>
        </div>
      </section>

      <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 md:p-5">
        <div className="flex flex-wrap gap-2">
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
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            placeholder="Buscar por unidade, morador ou referencia..."
            className="rounded-xl border border-outline-variant/30 bg-surface-container-highest px-4 py-3 text-sm outline-none"
          />
          <select
            value={sortBy}
            onChange={(event) => {
              setPage(1);
              setSortBy(event.target.value as 'dueDate' | 'amount' | 'unit' | 'resident' | 'reference' | 'status');
            }}
            className="rounded-xl border border-outline-variant/30 bg-surface-container-highest px-4 py-3 text-sm outline-none"
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
            className="rounded-xl border border-outline-variant/30 bg-surface-container-highest px-4 py-3 text-sm outline-none"
          >
            <option value="asc">Ordem crescente</option>
            <option value="desc">Ordem decrescente</option>
          </select>
        </div>
      </section>

      <section className="space-y-3 md:hidden">
        {invoices.map((invoice) => (
          <article key={invoice.id} className="rounded-2xl border border-outline-variant/25 bg-surface-container-low p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">{invoice.unit}</p>
                <h3 className="mt-1 text-base font-headline font-bold">{invoice.resident}</h3>
                <p className="mt-1 text-xs text-on-surface-variant">Referencia: {invoice.reference}</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusClass[invoice.status]}`}>
                {statusLabelMobile[invoice.status]}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-surface-container-highest px-2.5 py-2">
                <p className="uppercase tracking-widest text-on-surface-variant">Vencimento</p>
                <p className="mt-1 font-semibold text-on-surface">{invoice.dueDate}</p>
              </div>
              <div className="rounded-lg bg-surface-container-highest px-2.5 py-2">
                <p className="uppercase tracking-widest text-on-surface-variant">Valor</p>
                <p className="mt-1 font-semibold text-on-surface">{currency.format(invoice.amount)}</p>
              </div>
            </div>

            <div className="mt-3">
              {invoice.status === 'paid' ? (
                <span className="text-xs font-semibold text-on-surface-variant">Quitada</span>
              ) : (
                <button
                  onClick={() => void registerPayment(invoice.id)}
                  disabled={payingId === invoice.id}
                  className="w-full rounded-lg bg-primary px-3 py-2 text-xs font-bold text-on-primary disabled:opacity-50"
                >
                  {payingId === invoice.id ? 'Salvando...' : 'Registrar'}
                </button>
              )}
            </div>
          </article>
        ))}
      </section>

      <section className="hidden overflow-x-auto rounded-2xl border border-outline-variant/30 bg-surface-container-low p-5 md:block">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant">
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
                  <span className={`rounded px-2 py-1 text-xs font-bold ${statusClass[invoice.status]}`}>{statusLabel[invoice.status]}</span>
                </td>
                <td className="py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(invoice)}
                      className="rounded bg-surface-container-highest px-2.5 py-1.5 text-xs font-bold hover:opacity-80"
                    >
                      Editar
                    </button>
                    {invoice.status !== 'paid' && (
                      <button
                        onClick={() => void registerPayment(invoice.id)}
                        disabled={payingId === invoice.id}
                        className="rounded bg-primary px-3 py-1.5 text-xs font-bold text-on-primary disabled:opacity-50"
                      >
                        {payingId === invoice.id ? 'Salvando...' : 'Registrar pagamento'}
                      </button>
                    )}
                    {invoice.status === 'paid' && (
                      <span className="text-xs text-on-surface-variant">Quitada</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
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
    </div>
    </>
  );
}
