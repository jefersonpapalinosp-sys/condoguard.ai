import { FormEvent, useEffect, useState } from 'react';
import {
  createEnelRun,
  fetchEnelRunDetail,
  fetchEnelRuns,
  type EnelInvoiceInput,
  type EnelRun,
  type EnelRunDetail,
  type EnelRunStatus,
} from '../../../services/enelService';
import { DataSourceBadge } from '../../../shared/ui/DataSourceBadge';
import { LoadingState } from '../../../shared/ui/states/LoadingState';
import { ErrorState } from '../../../shared/ui/states/ErrorState';
import { EmptyState } from '../../../shared/ui/states/EmptyState';

const statusLabel: Record<EnelRunStatus, string> = {
  processing: 'Processando',
  completed: 'Concluido',
  completed_with_errors: 'Com erros',
  failed: 'Falhou',
};

const statusClass: Record<EnelRunStatus, string> = {
  processing: 'bg-secondary-container text-on-secondary-container',
  completed: 'bg-tertiary-fixed-dim/30 text-on-tertiary-fixed-variant',
  completed_with_errors: 'bg-error-container/60 text-on-error-container',
  failed: 'bg-error-container text-on-error-container',
};

const resultClass: Record<string, string> = {
  imported: 'text-on-tertiary-fixed-variant',
  skipped: 'text-on-surface-variant',
  failed: 'text-error',
};

type InvoiceRow = EnelInvoiceInput & { _key: number };

function emptyRow(key: number): InvoiceRow {
  return { _key: key, unit: '', dueDate: '', amount: 0, reference: '', resident: '' };
}

export default function EnelIntegrationPage() {
  const [rows, setRows] = useState<InvoiceRow[]>([emptyRow(0)]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<EnelRunDetail | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [runs, setRuns] = useState<EnelRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [runsMeta, setRunsMeta] = useState({ page: 1, totalPages: 1, hasNext: false, hasPrevious: false });
  const [statusFilter, setStatusFilter] = useState<EnelRunStatus | 'all'>('all');
  const [page, setPage] = useState(1);

  const [selectedRun, setSelectedRun] = useState<EnelRunDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  let nextKey = rows.length;

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setRunsLoading(true);
        const response = await fetchEnelRuns({
          page,
          pageSize: 10,
          status: statusFilter === 'all' ? undefined : statusFilter,
        });
        if (active) {
          setRuns(response.items);
          setRunsMeta(response.meta);
          setRunsError(null);
        }
      } catch {
        if (active) setRunsError('Falha ao carregar historico de importacoes.');
      } finally {
        if (active) setRunsLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [page, statusFilter, submitResult]);

  function addRow() {
    setRows((current) => [...current, emptyRow(nextKey++)]);
  }

  function removeRow(key: number) {
    setRows((current) => current.filter((r) => r._key !== key));
  }

  function updateRow(key: number, field: keyof EnelInvoiceInput, value: string) {
    setRows((current) =>
      current.map((r) =>
        r._key === key ? { ...r, [field]: field === 'amount' ? parseFloat(value) || 0 : value } : r,
      ),
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    const validRows = rows.filter((r) => r.unit.trim() && r.dueDate && r.amount > 0);
    if (validRows.length === 0) {
      setSubmitError('Adicione ao menos um item com unidade, vencimento e valor.');
      return;
    }

    try {
      setSubmitting(true);
      const result = await createEnelRun({ notes: notes.trim() || undefined, items: validRows });
      setSubmitResult(result);
      setRows([emptyRow(0)]);
      setNotes('');
    } catch {
      setSubmitError('Falha ao processar importacao. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  async function openDetail(runId: string) {
    try {
      setDetailLoading(true);
      const detail = await fetchEnelRunDetail(runId);
      setSelectedRun(detail);
    } catch {
      // ignore
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:space-y-8 md:p-8">
      {/* Header */}
      <section className="rounded-3xl bg-[linear-gradient(135deg,#1a2035_0%,#1e3a5f_60%,#1a5276_100%)] p-5 text-white shadow-xl md:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/75">Integracao</p>
            <h2 className="mt-2 font-headline text-2xl font-extrabold tracking-tight md:text-4xl">Importacao Enel</h2>
            <p className="mt-2 text-sm text-white/85 md:text-base">
              Importe faturas de energia da Enel em lote com deduplicacao automatica.
            </p>
          </div>
          <DataSourceBadge module="enel" />
        </div>
      </section>

      {/* Import form */}
      <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-5">
        <h3 className="font-headline text-lg font-bold mb-4">Nova importacao</h3>

        {submitResult && (
          <div className="mb-4 rounded-xl bg-tertiary-fixed-dim/20 border border-tertiary-fixed-dim/40 p-4">
            <p className="text-sm font-bold text-on-tertiary-fixed-variant">
              Importacao processada — {submitResult.summary.imported} importadas, {submitResult.summary.skipped} ignoradas, {submitResult.summary.failed} falhas
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant">
                  <th className="pb-2 pr-2">Unidade *</th>
                  <th className="pb-2 pr-2">Morador</th>
                  <th className="pb-2 pr-2">Referencia</th>
                  <th className="pb-2 pr-2">Vencimento *</th>
                  <th className="pb-2 pr-2">Valor (R$) *</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="space-y-1">
                {rows.map((row) => (
                  <tr key={row._key}>
                    <td className="pr-2 py-1">
                      <input value={row.unit} onChange={(e) => updateRow(row._key, 'unit', e.target.value)}
                        placeholder="A-101"
                        className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-highest px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary-fixed" />
                    </td>
                    <td className="pr-2 py-1">
                      <input value={row.resident ?? ''} onChange={(e) => updateRow(row._key, 'resident', e.target.value)}
                        placeholder="Nome"
                        className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-highest px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary-fixed" />
                    </td>
                    <td className="pr-2 py-1">
                      <input value={row.reference ?? ''} onChange={(e) => updateRow(row._key, 'reference', e.target.value)}
                        placeholder="Abr/2026"
                        className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-highest px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary-fixed" />
                    </td>
                    <td className="pr-2 py-1">
                      <input type="date" value={row.dueDate} onChange={(e) => updateRow(row._key, 'dueDate', e.target.value)}
                        className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-highest px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary-fixed" />
                    </td>
                    <td className="pr-2 py-1">
                      <input type="number" step="0.01" min="0.01"
                        value={row.amount || ''} onChange={(e) => updateRow(row._key, 'amount', e.target.value)}
                        placeholder="0,00"
                        className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-highest px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary-fixed" />
                    </td>
                    <td className="py-1">
                      {rows.length > 1 && (
                        <button type="button" onClick={() => removeRow(row._key)}
                          className="rounded px-2 py-1.5 text-[10px] font-bold bg-error-container text-on-error-container hover:opacity-80">
                          X
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button type="button" onClick={addRow}
            className="rounded-lg bg-surface-container-highest px-4 py-2 text-xs font-bold hover:opacity-80">
            + Adicionar linha
          </button>

          <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Observacoes (opcional)
            <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500}
              placeholder="Descricao da importacao..."
              className="mt-2 w-full rounded-lg border border-outline-variant/30 bg-surface-container-highest px-3 py-2 outline-none focus:ring-2 focus:ring-primary-fixed" />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={submitting}
              className="rounded-lg bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-on-primary disabled:opacity-50">
              {submitting ? 'Processando...' : 'Processar importacao'}
            </button>
            {submitError && <span className="text-xs text-error">{submitError}</span>}
          </div>
        </form>
      </section>

      {/* History */}
      <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-headline text-lg font-bold">Historico de importacoes</h3>
          <div className="flex flex-wrap gap-2">
            {(['all', 'completed', 'completed_with_errors', 'failed'] as const).map((s) => (
              <button key={s} type="button"
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors ${statusFilter === s ? 'bg-primary text-on-primary' : 'bg-surface-container-highest'}`}>
                {s === 'all' ? 'Todos' : statusLabel[s as EnelRunStatus]}
              </button>
            ))}
          </div>
        </div>

        {runsLoading ? (
          <LoadingState message="Carregando historico..." />
        ) : runsError ? (
          <ErrorState message={runsError} />
        ) : runs.length === 0 ? (
          <EmptyState message="Nenhuma importacao registrada." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant">
                    <th className="py-2">ID</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Inicio</th>
                    <th className="py-2">Importadas</th>
                    <th className="py-2">Falhas</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.runId} className="border-t border-outline-variant/20">
                      <td className="py-3 font-mono text-xs text-on-surface-variant">{run.runId.slice(-8)}</td>
                      <td className="py-3">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusClass[run.status]}`}>
                          {statusLabel[run.status]}
                        </span>
                      </td>
                      <td className="py-3 text-xs">{new Date(run.startedAt).toLocaleString('pt-BR')}</td>
                      <td className="py-3 text-xs">{run.summary?.imported ?? '-'}</td>
                      <td className="py-3 text-xs">{run.summary?.failed ?? '-'}</td>
                      <td className="py-3">
                        <button
                          type="button"
                          onClick={() => void openDetail(run.runId)}
                          disabled={detailLoading}
                          className="rounded bg-surface-container-highest px-2.5 py-1 text-[10px] font-bold hover:opacity-80 disabled:opacity-50"
                        >
                          Ver detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-on-surface-variant">
                Pagina {runsMeta.page} de {runsMeta.totalPages} | Total: {runsMeta.page}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!runsMeta.hasPrevious}
                  className="rounded-lg bg-surface-container-highest px-3 py-2 text-xs font-bold disabled:opacity-50">
                  Anterior
                </button>
                <button onClick={() => setPage((p) => p + 1)} disabled={!runsMeta.hasNext}
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-on-primary disabled:opacity-50">
                  Proxima
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Detail drawer */}
      {selectedRun && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setSelectedRun(null)}>
          <aside
            className="h-full w-full max-w-xl overflow-y-auto bg-surface-container-low p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-headline text-lg font-bold">Detalhes da importacao</h3>
              <button type="button" onClick={() => setSelectedRun(null)}
                className="rounded-lg bg-surface-container-highest px-3 py-1.5 text-xs font-bold">
                Fechar
              </button>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-surface-container-highest p-3">
                <p className="uppercase tracking-widest text-on-surface-variant">Status</p>
                <p className="mt-1 font-bold">{statusLabel[selectedRun.status]}</p>
              </div>
              <div className="rounded-lg bg-surface-container-highest p-3">
                <p className="uppercase tracking-widest text-on-surface-variant">Duracao</p>
                <p className="mt-1 font-bold">{selectedRun.durationMs}ms</p>
              </div>
              <div className="rounded-lg bg-surface-container-highest p-3">
                <p className="uppercase tracking-widest text-on-surface-variant">Importadas</p>
                <p className="mt-1 font-bold text-on-tertiary-fixed-variant">{selectedRun.summary?.imported}</p>
              </div>
              <div className="rounded-lg bg-surface-container-highest p-3">
                <p className="uppercase tracking-widest text-on-surface-variant">Falhas</p>
                <p className="mt-1 font-bold text-error">{selectedRun.summary?.failed}</p>
              </div>
            </div>

            {selectedRun.errorSummary && (
              <div className="mb-4 rounded-xl bg-error-container/40 p-3 text-xs text-on-error-container">
                {selectedRun.errorSummary}
              </div>
            )}

            <h4 className="text-sm font-bold mb-3">Itens ({selectedRun.items?.length ?? 0})</h4>
            <ul className="space-y-2">
              {(selectedRun.items ?? []).map((item) => (
                <li key={item.index} className="rounded-lg bg-surface-container-highest p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{String((item.raw as Record<string, unknown>)?.unit ?? `#${item.index}`)}</span>
                    <span className={`font-bold ${resultClass[item.result] ?? ''}`}>{item.result}</span>
                  </div>
                  {item.reason && <p className="mt-1 text-on-surface-variant">{item.reason}</p>}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}
    </div>
  );
}
