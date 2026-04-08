import { useEffect, useState } from 'react';
import { EmptyState } from '../../../shared/ui/states/EmptyState';
import { ErrorState } from '../../../shared/ui/states/ErrorState';
import { ContractRiskBadge } from '../components/ContractsBadges';
import { ContractsLoadingSkeleton } from '../components/ContractsLoadingSkeleton';
import { ContractsPageShell } from '../components/ContractsPageShell';
import { fetchContractsAudit } from '../services/contractsManagementService';
import type { ContractsAuditResponse } from '../types/contracts';

const filterFieldClass =
  'rounded-xl border border-outline-variant/30 bg-surface-container-highest px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-fixed';

export default function ContractsAuditPage() {
  const [data, setData] = useState<ContractsAuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [risk, setRisk] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [index, setIndex] = useState<'all' | 'IPCA' | 'IGPM' | 'INPC' | 'FIXO'>('all');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const payload = await fetchContractsAudit({
          search: search.trim() || undefined,
          risk: risk === 'all' ? undefined : risk,
          index: index === 'all' ? undefined : index,
        });
        if (active) {
          setData(payload);
          setError(null);
        }
      } catch {
        if (active) {
          setError('Falha ao carregar auditoria contratual.');
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
  }, [index, risk, search]);

  if (loading) {
    return (
      <ContractsLoadingSkeleton
        title="Auditoria contratual"
        subtitle="Analise de risco, impacto, comparativos e projecoes por indice."
        variant="table"
        message="Carregando auditoria de contratos..."
      />
    );
  }
  if (error || !data) return <ErrorState message={error || 'Falha ao carregar auditoria de contratos.'} />;

  return (
    <ContractsPageShell title="Auditoria contratual" subtitle="Analise de risco, impacto, comparativos e projecoes por indice.">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="motion-fade-up rounded-2xl bg-primary-container p-5 text-white">
          <p className="text-[11px] uppercase tracking-widest text-white/80">Gasto mensal total</p>
          <h3 className="mt-2 font-headline text-2xl font-extrabold">{data.totalMonthlySpend}</h3>
        </article>
        <article className="motion-fade-up motion-delay-1 rounded-2xl border border-outline-variant/25 bg-surface-container-highest p-5">
          <p className="text-[11px] uppercase tracking-widest text-on-surface-variant">Impacto trimestral</p>
          <h3 className="mt-2 font-headline text-2xl font-extrabold">{data.estimatedQuarterImpact}</h3>
        </article>
        <article className="motion-fade-up motion-delay-1 rounded-2xl border border-outline-variant/25 bg-surface-container-highest p-5">
          <p className="text-[11px] uppercase tracking-widest text-on-surface-variant">Contratos de alto risco</p>
          <h3 className="mt-2 font-headline text-2xl font-extrabold">{data.alerts.highRiskContracts}</h3>
        </article>
        <article className="motion-fade-up motion-delay-1 rounded-2xl border border-outline-variant/25 bg-surface-container-highest p-5">
          <p className="text-[11px] uppercase tracking-widest text-on-surface-variant">Vencendo em 30 dias</p>
          <h3 className="mt-2 font-headline text-2xl font-extrabold">{data.alerts.expiringIn30Days}</h3>
        </article>
      </section>

      <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 md:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            aria-label="Buscar itens da auditoria"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por fornecedor ou contrato..."
            className={filterFieldClass}
          />
          <select aria-label="Filtrar auditoria por risco" value={risk} onChange={(event) => setRisk(event.target.value as typeof risk)} className={filterFieldClass}>
            <option value="all">Todos os riscos</option>
            <option value="high">Alto</option>
            <option value="medium">Medio</option>
            <option value="low">Baixo</option>
          </select>
          <select aria-label="Filtrar auditoria por indice" value={index} onChange={(event) => setIndex(event.target.value as typeof index)} className={filterFieldClass}>
            <option value="all">Todos os indices</option>
            <option value="IPCA">IPCA</option>
            <option value="IGPM">IGPM</option>
            <option value="INPC">INPC</option>
            <option value="FIXO">FIXO</option>
          </select>
        </div>
      </section>

      {data.items.length === 0 ? (
        <EmptyState message="Nenhum contrato encontrado para os filtros selecionados." />
      ) : (
        <>
          <section className="space-y-3 md:hidden" aria-live="polite">
            {data.items.map((item) => (
              <article key={item.id} className="hover-lift rounded-2xl border border-outline-variant/25 bg-surface-container-low p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Fornecedor</p>
                    <h3 className="mt-1 font-headline text-base font-bold">{item.vendor}</h3>
                  </div>
                  <ContractRiskBadge risk={item.risk} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-surface-container-highest px-2.5 py-2">
                    <p className="uppercase tracking-widest text-on-surface-variant">Valor mensal</p>
                    <p className="mt-1 font-semibold">{item.monthlyValue}</p>
                  </div>
                  <div className="rounded-lg bg-surface-container-highest px-2.5 py-2">
                    <p className="uppercase tracking-widest text-on-surface-variant">Indice</p>
                    <p className="mt-1 font-semibold">{item.index}</p>
                  </div>
                  <div className="col-span-2 rounded-lg bg-surface-container-highest px-2.5 py-2">
                    <p className="uppercase tracking-widest text-on-surface-variant">Proximo reajuste</p>
                    <p className="mt-1 font-semibold">{item.nextAdjustment}</p>
                  </div>
                </div>

                <div className="mt-3 rounded-lg bg-surface-container-highest px-2.5 py-2 text-xs">
                  <p className="uppercase tracking-widest text-on-surface-variant">Observacao</p>
                  <p className="mt-1 text-on-surface">{item.note}</p>
                </div>
              </article>
            ))}
          </section>

          <section className="hidden overflow-x-auto rounded-2xl border border-outline-variant/30 bg-surface-container-low p-5 md:block">
            <table className="w-full min-w-[760px] text-sm">
              <caption className="sr-only">Auditoria de contratos com comparativo de risco e impacto por fornecedor.</caption>
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant">
                  <th scope="col" className="py-3">Fornecedor</th>
                  <th scope="col" className="py-3">Valor mensal</th>
                  <th scope="col" className="py-3">Indice</th>
                  <th scope="col" className="py-3">Proximo reajuste</th>
                  <th scope="col" className="py-3">Risco</th>
                  <th scope="col" className="py-3">Observacao</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} className="border-t border-outline-variant/20">
                    <th scope="row" className="py-3 text-left font-semibold">{item.vendor}</th>
                    <td className="py-3">{item.monthlyValue}</td>
                    <td className="py-3">{item.index}</td>
                    <td className="py-3">{item.nextAdjustment}</td>
                    <td className="py-3">
                      <ContractRiskBadge risk={item.risk} />
                    </td>
                    <td className="py-3 text-on-surface-variant">{item.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="rounded-2xl bg-surface-container-low p-5">
          <h4 className="font-headline text-lg font-extrabold">Comparacao por fornecedor</h4>
          <div className="mt-3 space-y-2">
            {data.comparisonsBySupplier.map((item) => (
              <div key={item.supplier} className="hover-lift flex items-center justify-between gap-3 rounded-lg bg-surface-container-highest px-3 py-2">
                <div>
                  <p className="font-semibold">{item.supplier}</p>
                  <p className="text-xs text-on-surface-variant">{item.contractsCount} contratos</p>
                </div>
                <p className="text-sm font-bold">{item.monthlyValue}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl bg-surface-container-low p-5">
          <h4 className="font-headline text-lg font-extrabold">Contratos com maior impacto</h4>
          <div className="mt-3 space-y-2">
            {data.topImpactContracts.map((item) => (
              <div key={item.id} className="hover-lift flex items-center justify-between gap-3 rounded-lg bg-surface-container-highest px-3 py-2">
                <div>
                  <p className="font-semibold">{item.contractNumber}</p>
                  <p className="text-xs text-on-surface-variant">{item.supplier}</p>
                </div>
                <p className="text-sm font-bold">{item.estimatedAdjustmentImpact}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg bg-surface-container-highest px-3 py-3">
            <p className="text-xs uppercase tracking-widest text-on-surface-variant">Variacao projetada por indice</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(data.projectedIndexVariation).map(([key, value]) => (
                <span key={key} className="rounded bg-surface-container-high px-2 py-1 text-xs font-bold">
                  {key}: {value}
                </span>
              ))}
            </div>
          </div>
        </article>
      </section>
    </ContractsPageShell>
  );
}
