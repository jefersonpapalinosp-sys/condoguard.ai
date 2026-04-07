import { useEffect, useMemo, useState } from 'react';
import { ContractRiskBadge } from '../components/ContractsBadges';
import { ContractsPageShell } from '../components/ContractsPageShell';
import { fetchContractsAdjustments, updateContract } from '../services/contractsManagementService';
import type { ContractRecord, ContractsAdjustmentsResponse } from '../types/contracts';
import { EmptyState } from '../../../shared/ui/states/EmptyState';
import { ErrorState } from '../../../shared/ui/states/ErrorState';
import { LoadingState } from '../../../shared/ui/states/LoadingState';

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

  if (loading) return <LoadingState message="Carregando reajustes de contratos..." />;
  if (error || !data) return <ErrorState message={error || 'Falha ao carregar reajustes.'} />;

  return (
    <ContractsPageShell title="Reajustes previstos" subtitle="Simulacao e registro de reajustes contratuais com impacto estimado.">
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <article className="bg-primary-container text-white rounded-xl p-5">
          <p className="text-[11px] uppercase tracking-widest text-on-primary-container">Reajustes proximos</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{data.summary.upcomingAdjustments}</h3>
        </article>
        <article className="bg-surface-container-highest rounded-xl p-5">
          <p className="text-[11px] uppercase tracking-widest text-on-surface-variant">Impacto estimado total</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{data.summary.estimatedImpact}</h3>
        </article>
      </section>

      {data.items.length === 0 ? (
        <EmptyState message="Nenhum contrato com reajuste previsto no periodo." />
      ) : (
        <section className="bg-surface-container-low rounded-xl p-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="text-left text-on-surface-variant uppercase tracking-widest text-[10px]">
                <th className="py-3">Contrato</th>
                <th className="py-3">Indice</th>
                <th className="py-3">Valor atual</th>
                <th className="py-3">Valor projetado</th>
                <th className="py-3">Impacto</th>
                <th className="py-3">Prox. reajuste</th>
                <th className="py-3">Risco</th>
                <th className="py-3">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} className="border-t border-outline-variant/20">
                  <td className="py-3">
                    <p className="font-bold">{item.contractNumber}</p>
                    <p className="text-xs text-on-surface-variant">{item.supplier}</p>
                  </td>
                  <td className="py-3">{item.index}</td>
                  <td className="py-3">{item.monthlyValueLabel}</td>
                  <td className="py-3 font-semibold">{item.projectedMonthlyValueLabel}</td>
                  <td className="py-3">{item.estimatedAdjustmentImpactLabel}</td>
                  <td className="py-3">{item.nextAdjustmentDate}</td>
                  <td className="py-3"><ContractRiskBadge risk={item.risk} /></td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSimulatedId(item.id)}
                        className="px-3 py-2 rounded bg-surface-container-highest text-xs font-bold"
                      >
                        Simular
                      </button>
                      <button
                        onClick={() => void applyAdjustment(item)}
                        disabled={runningAction === item.id}
                        className="px-3 py-2 rounded bg-primary text-on-primary text-xs font-bold disabled:opacity-50"
                      >
                        Aplicar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {simulatedContract ? (
        <section className="bg-surface-container-low rounded-xl p-5">
          <h4 className="font-headline text-lg font-extrabold">Simulacao de reajuste</h4>
          <p className="mt-2 text-sm">
            {simulatedContract.contractNumber} · {simulatedContract.supplier}
          </p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Valor atual: <strong>{simulatedContract.monthlyValueLabel}</strong> | Valor projetado:{' '}
            <strong>{simulatedContract.projectedMonthlyValueLabel}</strong> | Impacto:{' '}
            <strong>{simulatedContract.estimatedAdjustmentImpactLabel}</strong>
          </p>
        </section>
      ) : null}
    </ContractsPageShell>
  );
}
