import { useState } from 'react';
import { fetchReportsData, exportReportsCsv } from '../services/reportsService';
import type { ReportsApiResponse, ReportType } from '../services/reportsService';
import { DataSourceBadge } from '../shared/ui/DataSourceBadge';
import { LoadingState } from '../shared/ui/states/LoadingState';
import { ErrorState } from '../shared/ui/states/ErrorState';
import { EmptyState } from '../shared/ui/states/EmptyState';

const today = new Date().toISOString().slice(0, 10);
const firstOfMonth = today.slice(0, 8) + '01';

const REPORT_TYPES: Array<{ id: ReportType; label: string; icon: string }> = [
  { id: 'financeiro', label: 'Financeiro', icon: 'receipt_long' },
  { id: 'operacional', label: 'Operacional', icon: 'domain' },
  { id: 'contratos', label: 'Contratos', icon: 'description' },
];

export default function Reports() {
  const [reportType, setReportType] = useState<ReportType>('financeiro');
  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);
  const [data, setData] = useState<ReportsApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchReportsData({ type: reportType, from: fromDate, to: toDate });
      setData(response);
    } catch {
      setError('Falha ao gerar relatorio. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await exportReportsCsv({ type: reportType, from: fromDate, to: toDate });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-${reportType}-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Falha ao exportar CSV.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-headline text-2xl md:text-4xl font-extrabold tracking-tight">Relatorios</h2>
            <p className="text-on-surface-variant mt-1">Selecione o tipo e o periodo para gerar o relatorio.</p>
          </div>
          <DataSourceBadge module="reports" />
        </div>
      </section>

      {/* Controls */}
      <section className="sticky top-16 z-20 bg-surface/95 backdrop-blur border border-outline-variant/30 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          {/* Type tabs */}
          <div className="flex gap-1 rounded-xl bg-surface-container p-1">
            {REPORT_TYPES.map((rt) => (
              <button
                key={rt.id}
                type="button"
                onClick={() => setReportType(rt.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  reportType === rt.id
                    ? 'bg-primary-container text-white shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{rt.icon}</span>
                {rt.label}
              </button>
            ))}
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] uppercase tracking-widest text-on-surface-variant">De</label>
              <input
                type="date"
                value={fromDate}
                max={toDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-lg border border-outline-variant/60 bg-surface-container px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] uppercase tracking-widest text-on-surface-variant">Ate</label>
              <input
                type="date"
                value={toDate}
                min={fromDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-lg border border-outline-variant/60 bg-surface-container px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 sm:ml-auto">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-primary-container px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[16px]">assessment</span>
              {loading ? 'Gerando...' : 'Gerar relatorio'}
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || !data}
              className="flex items-center gap-2 rounded-xl border border-outline-variant/60 bg-surface-container px-4 py-2.5 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              {exporting ? 'Exportando...' : 'Exportar CSV'}
            </button>
          </div>
        </div>
      </section>

      {/* Content */}
      {loading && <LoadingState message="Gerando relatorio..." />}

      {error && !loading && <ErrorState message={error} />}

      {!loading && !error && !data && (
        <EmptyState message="Selecione o tipo de relatorio e o periodo, depois clique em Gerar relatorio." />
      )}

      {!loading && !error && data && (
        <>
          {/* Executive summary */}
          <section className="bg-primary-container text-white rounded-2xl p-5 md:p-8">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[18px] opacity-80">summarize</span>
              <p className="text-xs uppercase tracking-widest opacity-80">{data.executiveTitle}</p>
            </div>
            <p className="text-base md:text-lg max-w-3xl leading-relaxed">{data.executiveSummary}</p>
            <p className="text-[10px] mt-4 opacity-60">
              Periodo: {data.period?.from} a {data.period?.to} &nbsp;·&nbsp; Gerado em{' '}
              {data.generatedAt ? new Date(data.generatedAt).toLocaleString('pt-BR') : '—'}
            </p>
          </section>

          {/* Sections grid */}
          {data.sections && data.sections.length > 0 ? (
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.sections.map((section) => (
                <article
                  key={section.title}
                  className="bg-surface-container-highest rounded-2xl p-5 shadow-sm"
                >
                  <h3 className="font-headline font-bold text-base mb-3 text-on-surface">{section.title}</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-outline-variant/30">
                        <th className="text-left py-1.5 text-on-surface-variant font-medium text-xs uppercase tracking-wider">
                          Indicador
                        </th>
                        <th className="text-right py-1.5 text-on-surface-variant font-medium text-xs uppercase tracking-wider">
                          Valor
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.data.map((row) => (
                        <tr key={row.label} className="border-b border-outline-variant/20 last:border-0">
                          <td className="py-2 text-on-surface-variant">{row.label}</td>
                          <td className="py-2 text-right font-semibold text-on-surface">{row.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </article>
              ))}
            </section>
          ) : (
            <EmptyState message="Nenhuma secao disponivel para este relatorio." />
          )}
        </>
      )}
    </div>
  );
}
