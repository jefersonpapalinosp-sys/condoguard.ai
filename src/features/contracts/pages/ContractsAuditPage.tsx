import { useEffect, useState } from 'react';
import { ContractRiskBadge } from '../components/ContractsBadges';
import { ContractsPageShell } from '../components/ContractsPageShell';
import { fetchContractsAudit } from '../services/contractsManagementService';
import type { ContractsAuditResponse } from '../types/contracts';
import { EmptyState } from '../../../shared/ui/states/EmptyState';
import { ErrorState } from '../../../shared/ui/states/ErrorState';
import { LoadingState } from '../../../shared/ui/states/LoadingState';

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

  if (loading) return <LoadingState message="Carregando auditoria de contratos..." />;
  if (error || !data) return <ErrorState message={error || 'Falha ao carregar auditoria de contratos.'} />;

  return (
    <ContractsPageShell title="Auditoria contratual" subtitle="Analise de risco, impacto, comparativos e projecoes por indice.">
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <article className="bg-primary-container text-white rounded-xl p-5">
          <p className="text-[11px] uppercase tracking-widest text-on-primary-container">Gasto mensal total</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{data.totalMonthlySpend}</h3>
        </article>
        <article className="bg-surface-container-highest rounded-xl p-5">
          <p className="text-[11px] uppercase tracking-widest text-on-surface-variant">Impacto trimestral</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{data.estimatedQuarterImpact}</h3>
        </article>
        <article className="bg-surface-container-highest rounded-xl p-5">
          <p className="text-[11px] uppercase tracking-widest text-on-surface-variant">Contratos de alto risco</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{data.alerts.highRiskContracts}</h3>
        </article>
        <article className="bg-surface-container-highest rounded-xl p-5">
          <p className="text-[11px] uppercase tracking-widest text-on-surface-variant">Vencendo em 30 dias</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{data.alerts.expiringIn30Days}</h3>
        </article>
      </section>

      <section className="bg-surface-container-low rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por fornecedor ou contrato..."
          className="px-3 py-2 rounded-lg bg-surface-container-highest outline-none"
        />
        <select
          value={risk}
          onChange={(event) => setRisk(event.target.value as typeof risk)}
          className="px-3 py-2 rounded-lg bg-surface-container-highest outline-none"
        >
          <option value="all">Todos os riscos</option>
          <option value="high">Alto</option>
          <option value="medium">Medio</option>
          <option value="low">Baixo</option>
        </select>
        <select
          value={index}
          onChange={(event) => setIndex(event.target.value as typeof index)}
          className="px-3 py-2 rounded-lg bg-surface-container-highest outline-none"
        >
          <option value="all">Todos os indices</option>
          <option value="IPCA">IPCA</option>
          <option value="IGPM">IGPM</option>
          <option value="INPC">INPC</option>
          <option value="FIXO">FIXO</option>
        </select>
      </section>

      {data.items.length === 0 ? (
        <EmptyState message="Nenhum contrato encontrado para os filtros selecionados." />
      ) : (
        <section className="bg-surface-container-low rounded-xl p-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-on-surface-variant uppercase tracking-widest text-[10px]">
                <th className="py-3">Fornecedor</th>
                <th className="py-3">Valor mensal</th>
                <th className="py-3">Indice</th>
                <th className="py-3">Proximo reajuste</th>
                <th className="py-3">Risco</th>
                <th className="py-3">Observacao</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} className="border-t border-outline-variant/20">
                  <td className="py-3 font-semibold">{item.vendor}</td>
                  <td className="py-3">{item.monthlyValue}</td>
                  <td className="py-3">{item.index}</td>
                  <td className="py-3">{item.nextAdjustment}</td>
                  <td className="py-3"><ContractRiskBadge risk={item.risk} /></td>
                  <td className="py-3 text-on-surface-variant">{item.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <article className="bg-surface-container-low rounded-xl p-5">
          <h4 className="font-headline text-lg font-extrabold">Comparacao por fornecedor</h4>
          <div className="mt-3 space-y-2">
            {data.comparisonsBySupplier.map((item) => (
              <div key={item.supplier} className="rounded-lg bg-surface-container-highest px-3 py-2 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{item.supplier}</p>
                  <p className="text-xs text-on-surface-variant">{item.contractsCount} contratos</p>
                </div>
                <p className="text-sm font-bold">{item.monthlyValue}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="bg-surface-container-low rounded-xl p-5">
          <h4 className="font-headline text-lg font-extrabold">Contratos com maior impacto</h4>
          <div className="mt-3 space-y-2">
            {data.topImpactContracts.map((item) => (
              <div key={item.id} className="rounded-lg bg-surface-container-highest px-3 py-2 flex items-center justify-between">
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
                <span key={key} className="px-2 py-1 rounded bg-surface-container-high text-xs font-bold">
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
