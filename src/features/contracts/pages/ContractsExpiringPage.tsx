import { useEffect, useState } from 'react';
import { ContractRiskBadge, ContractStatusBadge } from '../components/ContractsBadges';
import { ContractsPageShell } from '../components/ContractsPageShell';
import { closeContract, fetchContractsExpiring, renewContract } from '../services/contractsManagementService';
import type { ContractRecord, ContractsExpiringResponse } from '../types/contracts';
import { EmptyState } from '../../../shared/ui/states/EmptyState';
import { ErrorState } from '../../../shared/ui/states/ErrorState';
import { LoadingState } from '../../../shared/ui/states/LoadingState';

type GroupKey = 'expired' | 'in30Days' | 'in60Days' | 'in90Days';

const groupLabel: Record<GroupKey, string> = {
  expired: 'Vencidos',
  in30Days: 'Vencem em 30 dias',
  in60Days: 'Vencem em 60 dias',
  in90Days: 'Vencem em 90 dias',
};

export default function ContractsExpiringPage() {
  const [data, setData] = useState<ContractsExpiringResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningAction, setRunningAction] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const payload = await fetchContractsExpiring();
        if (active) {
          setData(payload);
          setError(null);
        }
      } catch {
        if (active) {
          setError('Falha ao carregar contratos com vencimento.');
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

  async function handleRenew(item: ContractRecord) {
    setRunningAction(item.id);
    try {
      await renewContract(item.id);
      setData(await fetchContractsExpiring());
    } finally {
      setRunningAction(null);
    }
  }

  async function handleClose(item: ContractRecord) {
    setRunningAction(item.id);
    try {
      await closeContract(item.id);
      setData(await fetchContractsExpiring());
    } finally {
      setRunningAction(null);
    }
  }

  if (loading) return <LoadingState message="Carregando vencimentos contratuais..." />;
  if (error || !data) return <ErrorState message={error || 'Falha ao carregar vencimentos.'} />;

  const groups = Object.entries(data.groups) as Array<[GroupKey, ContractRecord[]]>;
  const allEmpty = groups.every(([, items]) => items.length === 0);

  return (
    <ContractsPageShell title="Vencimentos de contratos" subtitle="Acompanhamento de contratos vencidos e janela de renovacao em 30/60/90 dias.">
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <article className="bg-error-container text-on-error-container rounded-xl p-5">
          <p className="text-[11px] uppercase tracking-widest">Vencidos</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{data.summary.expired}</h3>
        </article>
        <article className="bg-secondary-container text-on-secondary-container rounded-xl p-5">
          <p className="text-[11px] uppercase tracking-widest">Em 30 dias</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{data.summary.in30Days}</h3>
        </article>
        <article className="bg-surface-container-highest rounded-xl p-5">
          <p className="text-[11px] uppercase tracking-widest text-on-surface-variant">Em 60 dias</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{data.summary.in60Days}</h3>
        </article>
        <article className="bg-surface-container-highest rounded-xl p-5">
          <p className="text-[11px] uppercase tracking-widest text-on-surface-variant">Em 90 dias</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{data.summary.in90Days}</h3>
        </article>
      </section>

      {allEmpty ? (
        <EmptyState message="Nao ha contratos em janela de vencimento." />
      ) : (
        <section className="space-y-4">
          {groups.map(([key, items]) => (
            <article key={key} className="bg-surface-container-low rounded-xl p-4">
              <h4 className="font-headline text-lg font-extrabold">{groupLabel[key]}</h4>
              {items.length === 0 ? (
                <p className="text-sm text-on-surface-variant mt-2">Sem contratos neste grupo.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="rounded-lg bg-surface-container-highest px-3 py-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-on-surface-variant">{item.contractNumber}</p>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-xs text-on-surface-variant">
                          {item.supplier} · Fim: {item.endDate}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <ContractStatusBadge status={item.status} />
                        <ContractRiskBadge risk={item.risk} />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => void handleRenew(item)}
                          disabled={runningAction === item.id}
                          className="px-3 py-2 rounded bg-primary text-on-primary text-xs font-bold disabled:opacity-50"
                        >
                          Renovar
                        </button>
                        <button
                          onClick={() => void handleClose(item)}
                          disabled={runningAction === item.id}
                          className="px-3 py-2 rounded bg-error text-white text-xs font-bold disabled:opacity-50"
                        >
                          Encerrar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </section>
      )}
    </ContractsPageShell>
  );
}
