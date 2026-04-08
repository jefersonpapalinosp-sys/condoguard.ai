import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../../../shared/ui/states/EmptyState';
import { ErrorState } from '../../../shared/ui/states/ErrorState';
import { ContractRiskBadge, ContractStatusBadge } from '../components/ContractsBadges';
import { ContractsLoadingSkeleton } from '../components/ContractsLoadingSkeleton';
import { ContractsPageShell } from '../components/ContractsPageShell';
import { closeContract, fetchContractDetail, renewContract } from '../services/contractsManagementService';
import type { ContractDetailResponse } from '../types/contracts';

export default function ContractDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ContractDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningAction, setRunningAction] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        if (!id) throw new Error('id ausente');
        const details = await fetchContractDetail(id);
        if (active) {
          setData(details);
          setError(null);
        }
      } catch {
        if (active) {
          setError('Falha ao carregar detalhes do contrato.');
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
  }, [id]);

  async function handleRenew() {
    if (!id) return;
    setRunningAction('renew');
    try {
      await renewContract(id);
      const refreshed = await fetchContractDetail(id);
      setData(refreshed);
    } finally {
      setRunningAction(null);
    }
  }

  async function handleClose() {
    if (!id) return;
    setRunningAction('close');
    try {
      await closeContract(id);
      const refreshed = await fetchContractDetail(id);
      setData(refreshed);
    } finally {
      setRunningAction(null);
    }
  }

  if (loading) {
    return (
      <ContractsLoadingSkeleton
        title="Detalhes do contrato"
        subtitle="Carregando dados completos, alertas e documentos."
        variant="details"
        withAction
        message="Carregando detalhes do contrato..."
      />
    );
  }
  if (error || !data) return <ErrorState message={error || 'Falha ao carregar detalhes do contrato.'} />;

  return (
    <ContractsPageShell
      title={`Contrato ${data.item.contractNumber}`}
      subtitle={data.item.name}
      actions={
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button
            type="button"
            aria-label={`Editar contrato ${data.item.contractNumber}`}
            onClick={() => navigate(`/contracts/${data.item.id}/editar`)}
            className="interactive-focus w-full rounded-lg bg-surface-container-highest px-3 py-2 text-xs font-bold uppercase tracking-widest sm:w-auto"
          >
            Editar
          </button>
          <button
            type="button"
            aria-label={`Renovar contrato ${data.item.contractNumber}`}
            onClick={() => void handleRenew()}
            disabled={runningAction !== null}
            className="interactive-focus w-full rounded-lg bg-primary px-3 py-2 text-xs font-bold uppercase tracking-widest text-on-primary disabled:opacity-50 sm:w-auto"
          >
            Renovar
          </button>
          <button
            type="button"
            aria-label={`Encerrar contrato ${data.item.contractNumber}`}
            onClick={() => void handleClose()}
            disabled={runningAction !== null}
            className="interactive-focus w-full rounded-lg bg-error px-3 py-2 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-50 sm:w-auto"
          >
            Encerrar
          </button>
        </div>
      }
    >
      {runningAction ? (
        <p className="text-xs text-on-surface-variant" aria-live="polite">
          Atualizando contrato...
        </p>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-outline-variant/25 bg-surface-container-highest p-4">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Valor mensal</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{data.item.monthlyValueLabel}</h3>
        </article>
        <article className="rounded-2xl border border-outline-variant/25 bg-surface-container-highest p-4">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Indice</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{data.item.index}</h3>
        </article>
        <article className="rounded-2xl border border-outline-variant/25 bg-surface-container-highest p-4">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Proximo reajuste</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{data.item.nextAdjustmentDate}</h3>
        </article>
        <article className="rounded-2xl border border-outline-variant/25 bg-surface-container-highest p-4">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Vencimento</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{data.item.endDate}</h3>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="rounded-2xl bg-surface-container-low p-5">
          <h4 className="font-headline text-lg font-extrabold">Dados gerais</h4>
          <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <p className="rounded-lg bg-surface-container-highest px-3 py-2">
              <span className="font-semibold">Fornecedor:</span> {data.item.supplier}
            </p>
            <p className="rounded-lg bg-surface-container-highest px-3 py-2">
              <span className="font-semibold">Categoria:</span> {data.item.category}
            </p>
            <p className="rounded-lg bg-surface-container-highest px-3 py-2">
              <span className="font-semibold">Servico:</span> {data.item.serviceType}
            </p>
            <p className="rounded-lg bg-surface-container-highest px-3 py-2">
              <span className="font-semibold">Inicio:</span> {data.item.startDate}
            </p>
            <p className="rounded-lg bg-surface-container-highest px-3 py-2">
              <span className="font-semibold">Fim:</span> {data.item.endDate}
            </p>
            <p className="rounded-lg bg-surface-container-highest px-3 py-2">
              <span className="font-semibold">Responsavel interno:</span> {data.item.internalOwner}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 pt-3">
            <ContractStatusBadge status={data.item.status} />
            <ContractRiskBadge risk={data.item.risk} />
          </div>
          <p className="pt-3 text-sm text-on-surface-variant">{data.item.description}</p>
        </article>

        <article className="rounded-2xl bg-surface-container-low p-5 space-y-3">
          <h4 className="font-headline text-lg font-extrabold">Alertas e observacoes</h4>
          {data.alerts.length === 0 ? (
            <p className="text-sm text-on-surface-variant">Sem alertas ativos para este contrato.</p>
          ) : (
            data.alerts.map((alert) => (
              <div key={`${alert.level}-${alert.message}`} className="rounded-lg bg-surface-container-highest px-3 py-2">
                <p className="text-xs uppercase tracking-widest text-on-surface-variant">{alert.level}</p>
                <p className="text-sm font-semibold">{alert.message}</p>
              </div>
            ))
          )}
          {data.item.notes ? (
            <div className="rounded-lg bg-surface-container-highest px-3 py-2">
              <p className="text-xs uppercase tracking-widest text-on-surface-variant">Observacoes</p>
              <p className="text-sm">{data.item.notes}</p>
            </div>
          ) : null}
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="rounded-2xl bg-surface-container-low p-5">
          <h4 className="font-headline text-lg font-extrabold">Documentos anexos</h4>
          {data.documents.length === 0 ? (
            <EmptyState message="Nenhum documento anexado para este contrato." />
          ) : (
            <div className="mt-3 space-y-2">
              {data.documents.map((doc) => (
                <div key={doc.id} className="hover-lift flex flex-col gap-2 rounded-lg bg-surface-container-highest px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">{doc.name}</p>
                    <p className="text-xs text-on-surface-variant">{doc.type} · {doc.sizeKb.toFixed(1)} KB</p>
                  </div>
                  <Link
                    to={`/contracts/documentos?contractId=${encodeURIComponent(data.item.id)}`}
                    className="interactive-focus text-xs font-bold text-primary"
                    aria-label={`Gerenciar documentos do contrato ${data.item.contractNumber}`}
                  >
                    Gerenciar
                  </Link>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-2xl bg-surface-container-low p-5">
          <h4 className="font-headline text-lg font-extrabold">Timeline de eventos</h4>
          {data.timeline.length === 0 ? (
            <EmptyState message="Sem eventos registrados para este contrato." />
          ) : (
            <div className="mt-3 space-y-2">
              {data.timeline.map((event) => (
                <div key={event.id} className="hover-lift rounded-lg bg-surface-container-highest px-3 py-2">
                  <p className="text-xs uppercase tracking-widest text-on-surface-variant">{event.type}</p>
                  <p className="font-semibold">{event.message}</p>
                  <p className="text-xs text-on-surface-variant mt-1">{event.createdAt}</p>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </ContractsPageShell>
  );
}
