import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../../../shared/ui/states/EmptyState';
import { ErrorState } from '../../../shared/ui/states/ErrorState';
import { LoadingState } from '../../../shared/ui/states/LoadingState';
import { ContractRiskBadge, ContractStatusBadge } from '../components/ContractsBadges';
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

  if (loading) return <LoadingState message="Carregando detalhes do contrato..." />;
  if (error || !data) return <ErrorState message={error || 'Falha ao carregar detalhes do contrato.'} />;

  return (
    <ContractsPageShell
      title={`Contrato ${data.item.contractNumber}`}
      subtitle={data.item.name}
      actions={
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/contracts/${data.item.id}/editar`)}
            className="px-3 py-2 rounded-lg bg-surface-container-highest text-xs font-bold uppercase tracking-widest"
          >
            Editar
          </button>
          <button
            onClick={() => void handleRenew()}
            disabled={runningAction !== null}
            className="px-3 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold uppercase tracking-widest disabled:opacity-50"
          >
            Renovar
          </button>
          <button
            onClick={() => void handleClose()}
            disabled={runningAction !== null}
            className="px-3 py-2 rounded-lg bg-error text-white text-xs font-bold uppercase tracking-widest disabled:opacity-50"
          >
            Encerrar
          </button>
        </div>
      }
    >
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <article className="bg-surface-container-highest rounded-xl p-4">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Valor mensal</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{data.item.monthlyValueLabel}</h3>
        </article>
        <article className="bg-surface-container-highest rounded-xl p-4">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Indice</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{data.item.index}</h3>
        </article>
        <article className="bg-surface-container-highest rounded-xl p-4">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Proximo reajuste</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{data.item.nextAdjustmentDate}</h3>
        </article>
        <article className="bg-surface-container-highest rounded-xl p-4">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Vencimento</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{data.item.endDate}</h3>
        </article>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <article className="bg-surface-container-low rounded-xl p-5 space-y-2">
          <h4 className="font-headline text-lg font-extrabold">Dados gerais</h4>
          <p><span className="font-semibold">Fornecedor:</span> {data.item.supplier}</p>
          <p><span className="font-semibold">Categoria:</span> {data.item.category}</p>
          <p><span className="font-semibold">Servico:</span> {data.item.serviceType}</p>
          <p><span className="font-semibold">Inicio:</span> {data.item.startDate}</p>
          <p><span className="font-semibold">Fim:</span> {data.item.endDate}</p>
          <p><span className="font-semibold">Responsavel interno:</span> {data.item.internalOwner}</p>
          <div className="flex gap-2 pt-1">
            <ContractStatusBadge status={data.item.status} />
            <ContractRiskBadge risk={data.item.risk} />
          </div>
          <p className="text-sm text-on-surface-variant pt-2">{data.item.description}</p>
        </article>

        <article className="bg-surface-container-low rounded-xl p-5 space-y-3">
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

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <article className="bg-surface-container-low rounded-xl p-5">
          <h4 className="font-headline text-lg font-extrabold">Documentos anexos</h4>
          {data.documents.length === 0 ? (
            <EmptyState message="Nenhum documento anexado para este contrato." />
          ) : (
            <div className="mt-3 space-y-2">
              {data.documents.map((doc) => (
                <div key={doc.id} className="rounded-lg bg-surface-container-highest px-3 py-2 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{doc.name}</p>
                    <p className="text-xs text-on-surface-variant">{doc.type} · {doc.sizeKb.toFixed(1)} KB</p>
                  </div>
                  <Link to={`/contracts/documentos?contractId=${encodeURIComponent(data.item.id)}`} className="text-xs font-bold text-primary">
                    Gerenciar
                  </Link>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="bg-surface-container-low rounded-xl p-5">
          <h4 className="font-headline text-lg font-extrabold">Timeline de eventos</h4>
          {data.timeline.length === 0 ? (
            <EmptyState message="Sem eventos registrados para este contrato." />
          ) : (
            <div className="mt-3 space-y-2">
              {data.timeline.map((event) => (
                <div key={event.id} className="rounded-lg bg-surface-container-highest px-3 py-2">
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
