import { useEffect, useState } from 'react';
import { ContractRiskBadge, ContractStatusBadge } from '../components/ContractsBadges';
import { ContractsLoadingSkeleton } from '../components/ContractsLoadingSkeleton';
import { ContractsPageShell } from '../components/ContractsPageShell';
import { closeContract, fetchContractsExpiring, renewContract } from '../services/contractsManagementService';
import type { ContractRecord, ContractsExpiringResponse } from '../types/contracts';
import { EmptyState } from '../../../shared/ui/states/EmptyState';
import { ErrorState } from '../../../shared/ui/states/ErrorState';

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
  const [runningAction, setRunningAction] = useState<{ id: string; type: 'renew' | 'close' } | null>(null);

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
    setRunningAction({ id: item.id, type: 'renew' });
    try {
      await renewContract(item.id);
      setData(await fetchContractsExpiring());
    } finally {
      setRunningAction(null);
    }
  }

  async function handleClose(item: ContractRecord) {
    setRunningAction({ id: item.id, type: 'close' });
    try {
      await closeContract(item.id);
      setData(await fetchContractsExpiring());
    } finally {
      setRunningAction(null);
    }
  }

  if (loading) {
    return (
      <ContractsLoadingSkeleton
        title="Vencimentos de contratos"
        subtitle="Acompanhamento de contratos vencidos e janela de renovacao em 30/60/90 dias."
        variant="table"
        message="Carregando vencimentos contratuais..."
      />
    );
  }
  if (error || !data) return <ErrorState message={error || 'Falha ao carregar vencimentos.'} />;

  const groups = Object.entries(data.groups) as Array<[GroupKey, ContractRecord[]]>;
  const allEmpty = groups.every(([, items]) => items.length === 0);

  return (
    <ContractsPageShell title="Vencimentos de contratos" subtitle="Acompanhamento de contratos vencidos e janela de renovacao em 30/60/90 dias.">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="motion-fade-up rounded-2xl bg-error-container p-5 text-on-error-container">
          <p className="text-[11px] uppercase tracking-widest">Vencidos</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{data.summary.expired}</h3>
        </article>
        <article className="motion-fade-up motion-delay-1 rounded-2xl bg-secondary-container p-5 text-on-secondary-container">
          <p className="text-[11px] uppercase tracking-widest">Em 30 dias</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{data.summary.in30Days}</h3>
        </article>
        <article className="motion-fade-up motion-delay-1 rounded-2xl border border-outline-variant/25 bg-surface-container-highest p-5">
          <p className="text-[11px] uppercase tracking-widest text-on-surface-variant">Em 60 dias</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{data.summary.in60Days}</h3>
        </article>
        <article className="motion-fade-up motion-delay-1 rounded-2xl border border-outline-variant/25 bg-surface-container-highest p-5">
          <p className="text-[11px] uppercase tracking-widest text-on-surface-variant">Em 90 dias</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{data.summary.in90Days}</h3>
        </article>
      </section>

      {runningAction ? (
        <p className="text-xs text-on-surface-variant" aria-live="polite">
          Atualizando contrato...
        </p>
      ) : null}

      {allEmpty ? (
        <EmptyState message="Nao ha contratos em janela de vencimento." />
      ) : (
        <section className="space-y-4" aria-busy={runningAction?.id ? true : undefined}>
          {groups.map(([key, items]) => (
            <article key={key} className="motion-fade-up motion-delay-2 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 md:p-5">
              <h4 className="font-headline text-lg font-extrabold">{groupLabel[key]}</h4>
              {items.length === 0 ? (
                <p className="text-sm text-on-surface-variant mt-2">Sem contratos neste grupo.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="hover-lift rounded-lg bg-surface-container-highest px-3 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-widest text-on-surface-variant">{item.contractNumber}</p>
                          <p className="font-semibold">{item.name}</p>
                          <p className="text-xs text-on-surface-variant">
                            {item.supplier} · Fim: {item.endDate}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <ContractStatusBadge status={item.status} />
                          <ContractRiskBadge risk={item.risk} />
                        </div>
                      </div>
                      <div className="mt-3 grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
                        <button
                          type="button"
                          aria-label={`Renovar contrato ${item.contractNumber}`}
                          onClick={() => void handleRenew(item)}
                          disabled={runningAction?.id === item.id}
                          className="interactive-focus rounded bg-primary px-3 py-2 text-xs font-bold text-on-primary disabled:opacity-50"
                        >
                          {runningAction?.id === item.id && runningAction.type === 'renew' ? 'Renovando...' : 'Renovar'}
                        </button>
                        <button
                          type="button"
                          aria-label={`Encerrar contrato ${item.contractNumber}`}
                          onClick={() => void handleClose(item)}
                          disabled={runningAction?.id === item.id}
                          className="interactive-focus rounded bg-error px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                        >
                          {runningAction?.id === item.id && runningAction.type === 'close' ? 'Encerrando...' : 'Encerrar'}
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
