import { useEffect, useMemo, useState } from 'react';
import { EmptyState } from '../../../shared/ui/states/EmptyState';
import { ErrorState } from '../../../shared/ui/states/ErrorState';
import { ContractRiskBadge } from '../components/ContractsBadges';
import { ContractsLoadingSkeleton } from '../components/ContractsLoadingSkeleton';
import { ContractsPageShell } from '../components/ContractsPageShell';
import { fetchContractsAdjustments, updateContract } from '../services/contractsManagementService';
import type { ContractRecord, ContractsAdjustmentsResponse } from '../types/contracts';

export default function ContractsAdjustmentsPage() {
  const [data, setData] = useState<ContractsAdjustmentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulatedId, setSimulatedId] = useState<string | null>(null);
  const [runningAction, setRunningAction] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const payload = await fetchContractsAdjustments();
        if (active) {
          setData(payload);
          setError(null);
        }
      } catch {
        if (active) {
          setError('Falha ao carregar reajustes previstos.');
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

  const simulatedContract = useMemo(
    () => data?.items.find((item) => item.id === simulatedId) ?? null,
    [data?.items, simulatedId],
  );

  async function applyAdjustment(item: ContractRecord) {
    setRunningAction(item.id);
    try {
      await updateContract(item.id, {
        monthlyValue: item.projectedMonthlyValue,
        notes: `${item.notes} Reajuste aplicado em ${new Date().toISOString().slice(0, 10)}.`,
      });
      setData(await fetchContractsAdjustments());
    } finally {
      setRunningAction(null);
    }
  }

  if (loading) {
    return (
      <ContractsLoadingSkeleton
        title="Reajustes previstos"
        subtitle="Simulacao e registro de reajustes contratuais com impacto estimado."
        variant="table"
        message="Carregando reajustes de contratos..."
      />
    );
  }
  if (error || !data) return <ErrorState message={error || 'Falha ao carregar reajustes.'} />;

  return (
    <ContractsPageShell title="Reajustes previstos" subtitle="Simulacao e registro de reajustes contratuais com impacto estimado.">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <article className="motion-fade-up rounded-2xl bg-primary-container p-5 text-white">
          <p className="text-[11px] uppercase tracking-widest text-white/80">Reajustes proximos</p>
          <h3 className="mt-2 font-headline text-2xl font-extrabold">{data.summary.upcomingAdjustments}</h3>
        </article>
        <article className="motion-fade-up motion-delay-1 rounded-2xl border border-outline-variant/25 bg-surface-container-highest p-5">
          <p className="text-[11px] uppercase tracking-widest text-on-surface-variant">Impacto estimado total</p>
          <h3 className="mt-2 font-headline text-2xl font-extrabold">{data.summary.estimatedImpact}</h3>
        </article>
      </section>

      {runningAction ? (
        <p className="text-xs text-on-surface-variant" aria-live="polite">
          Aplicando reajuste...
        </p>
      ) : null}

      {data.items.length === 0 ? (
        <EmptyState message="Nenhum contrato com reajuste previsto no periodo." />
      ) : (
        <>
          <section className="space-y-3 md:hidden" aria-busy={runningAction ? true : undefined}>
            {data.items.map((item) => (
              <article key={item.id} className="hover-lift rounded-2xl border border-outline-variant/25 bg-surface-container-low p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">{item.contractNumber}</p>
                    <h3 className="mt-1 font-headline text-base font-bold">{item.supplier}</h3>
                  </div>
                  <ContractRiskBadge risk={item.risk} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-surface-container-highest px-2.5 py-2">
                    <p className="uppercase tracking-widest text-on-surface-variant">Indice</p>
                    <p className="mt-1 font-semibold">{item.index}</p>
                  </div>
                  <div className="rounded-lg bg-surface-container-highest px-2.5 py-2">
                    <p className="uppercase tracking-widest text-on-surface-variant">Prox. reajuste</p>
                    <p className="mt-1 font-semibold">{item.nextAdjustmentDate}</p>
                  </div>
                  <div className="rounded-lg bg-surface-container-highest px-2.5 py-2">
                    <p className="uppercase tracking-widest text-on-surface-variant">Valor atual</p>
                    <p className="mt-1 font-semibold">{item.monthlyValueLabel}</p>
                  </div>
                  <div className="rounded-lg bg-surface-container-highest px-2.5 py-2">
                    <p className="uppercase tracking-widest text-on-surface-variant">Valor projetado</p>
                    <p className="mt-1 font-semibold">{item.projectedMonthlyValueLabel}</p>
                  </div>
                </div>

                <div className="mt-3 rounded-lg bg-surface-container-highest px-2.5 py-2 text-xs">
                  <p className="uppercase tracking-widest text-on-surface-variant">Impacto estimado</p>
                  <p className="mt-1 font-semibold">{item.estimatedAdjustmentImpactLabel}</p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    aria-label={`Simular reajuste do contrato ${item.contractNumber}`}
                    onClick={() => setSimulatedId(item.id)}
                    className="interactive-focus w-full rounded-lg bg-surface-container-highest px-3 py-2 text-xs font-bold"
                  >
                    Simular
                  </button>
                  <button
                    type="button"
                    aria-label={`Aplicar reajuste do contrato ${item.contractNumber}`}
                    onClick={() => void applyAdjustment(item)}
                    disabled={runningAction === item.id}
                    className="interactive-focus w-full rounded-lg bg-primary px-3 py-2 text-xs font-bold text-on-primary disabled:opacity-50"
                  >
                    {runningAction === item.id ? 'Aplicando...' : 'Aplicar'}
                  </button>
                </div>
              </article>
            ))}
          </section>

          <section className="hidden overflow-x-auto rounded-2xl border border-outline-variant/30 bg-surface-container-low p-5 md:block" aria-busy={runningAction ? true : undefined}>
            <table className="w-full min-w-[980px] text-sm">
              <caption className="sr-only">Reajustes previstos com valores atuais, projetados e impacto financeiro.</caption>
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant">
                  <th scope="col" className="py-3">Contrato</th>
                  <th scope="col" className="py-3">Indice</th>
                  <th scope="col" className="py-3">Valor atual</th>
                  <th scope="col" className="py-3">Valor projetado</th>
                  <th scope="col" className="py-3">Impacto</th>
                  <th scope="col" className="py-3">Prox. reajuste</th>
                  <th scope="col" className="py-3">Risco</th>
                  <th scope="col" className="py-3">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} className="border-t border-outline-variant/20">
                    <th scope="row" className="py-3 text-left">
                      <p className="font-bold">{item.contractNumber}</p>
                      <p className="text-xs text-on-surface-variant">{item.supplier}</p>
                    </th>
                    <td className="py-3">{item.index}</td>
                    <td className="py-3">{item.monthlyValueLabel}</td>
                    <td className="py-3 font-semibold">{item.projectedMonthlyValueLabel}</td>
                    <td className="py-3">{item.estimatedAdjustmentImpactLabel}</td>
                    <td className="py-3">{item.nextAdjustmentDate}</td>
                    <td className="py-3">
                      <ContractRiskBadge risk={item.risk} />
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          aria-label={`Simular reajuste do contrato ${item.contractNumber}`}
                          onClick={() => setSimulatedId(item.id)}
                          className="interactive-focus rounded bg-surface-container-highest px-3 py-2 text-xs font-bold"
                        >
                          Simular
                        </button>
                        <button
                          type="button"
                          aria-label={`Aplicar reajuste do contrato ${item.contractNumber}`}
                          onClick={() => void applyAdjustment(item)}
                          disabled={runningAction === item.id}
                          className="interactive-focus rounded bg-primary px-3 py-2 text-xs font-bold text-on-primary disabled:opacity-50"
                        >
                          {runningAction === item.id ? 'Aplicando...' : 'Aplicar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      {simulatedContract ? (
        <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 md:p-5">
          <h4 className="font-headline text-lg font-extrabold">Simulacao de reajuste</h4>
          <p className="mt-2 text-sm">
            {simulatedContract.contractNumber} · {simulatedContract.supplier}
          </p>
          <p className="mt-2 text-sm text-on-surface-variant">
            Valor atual: <strong>{simulatedContract.monthlyValueLabel}</strong> | Valor projetado:{' '}
            <strong>{simulatedContract.projectedMonthlyValueLabel}</strong> | Impacto:{' '}
            <strong>{simulatedContract.estimatedAdjustmentImpactLabel}</strong>
          </p>
        </section>
      ) : null}
    </ContractsPageShell>
  );
}
