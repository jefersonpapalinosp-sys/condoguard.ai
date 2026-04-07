import { useEffect, useState } from 'react';
import { fetchReportsData } from '../services/reportsService';
import type { ReportsData } from '../services/mockApi';
import { DataSourceBadge } from '../shared/ui/DataSourceBadge';
import { LoadingState } from '../shared/ui/states/LoadingState';
import { ErrorState } from '../shared/ui/states/ErrorState';
import { EmptyState } from '../shared/ui/states/EmptyState';

export default function Reports() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const response = await fetchReportsData();
        if (active) {
          setData(response);
          setError(null);
        }
      } catch {
        if (active) {
          setError('Falha ao carregar relatorios.');
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
    return <LoadingState message="Carregando relatorios inteligentes..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!data || data.items.length === 0) {
    return <EmptyState message="Nenhum relatorio disponivel." />;
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-headline text-2xl md:text-4xl font-extrabold tracking-tight">Relatorios inteligentes</h2>
            <p className="text-on-surface-variant mt-2">Consolidado gerencial e operacional baseado no periodo vigente.</p>
          </div>
          <DataSourceBadge module="reports" />
        </div>
      </section>

      <section className="bg-primary-container text-white rounded-xl p-4 md:p-8">
        <p className="text-xs uppercase tracking-widest text-on-primary-container">{data.executiveTitle}</p>
        <p className="text-lg mt-3 max-w-3xl">{data.executiveSummary}</p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.items.map((item) => (
          <article key={item.id} className="bg-surface-container-highest p-6 rounded-xl">
            <span className="text-xs text-on-surface-variant uppercase tracking-widest">{item.generatedAt}</span>
            <h3 className="font-headline font-bold text-xl mt-2">{item.title}</h3>
            <p className="text-sm text-on-surface-variant mt-2">{item.subtitle}</p>
            <button
              type="button"
              disabled
              className="mt-4 text-sm font-bold text-on-surface-variant opacity-70 cursor-not-allowed"
              title="Fluxo completo entra na Sprint 4"
            >
              Abrir relatorio (em breve)
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}
