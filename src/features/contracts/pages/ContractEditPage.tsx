import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ErrorState } from '../../../shared/ui/states/ErrorState';
import { ContractForm } from '../components/ContractForm';
import { ContractsLoadingSkeleton } from '../components/ContractsLoadingSkeleton';
import { ContractsPageShell } from '../components/ContractsPageShell';
import { fetchContractDetail, updateContract } from '../services/contractsManagementService';
import type { ContractDetailResponse, ContractUpsertPayload } from '../types/contracts';

export default function ContractEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ContractDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          setError('Falha ao carregar dados do contrato.');
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

  async function handleSubmit(payload: ContractUpsertPayload) {
    if (!id) return;
    try {
      setSubmitting(true);
      await updateContract(id, payload);
      navigate(`/contracts/${id}`);
    } catch {
      setError('Nao foi possivel salvar as alteracoes.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <ContractsLoadingSkeleton
        title="Editar contrato"
        subtitle="Carregando dados para edicao."
        variant="form"
        message="Carregando contrato para edicao..."
      />
    );
  }
  if (error || !data) return <ErrorState message={error || 'Falha ao carregar contrato.'} />;

  return (
    <ContractsPageShell title="Editar contrato" subtitle={`${data.item.contractNumber} - ${data.item.name}`}>
      <ContractForm
        initialValue={{
          contractNumber: data.item.contractNumber,
          name: data.item.name,
          supplier: data.item.supplier,
          category: data.item.category,
          description: data.item.description,
          serviceType: data.item.serviceType,
          startDate: data.item.startDate,
          endDate: data.item.endDate,
          termMonths: data.item.termMonths,
          monthlyValue: data.item.monthlyValue,
          index: data.item.index,
          adjustmentFrequencyMonths: data.item.adjustmentFrequencyMonths,
          nextAdjustmentDate: data.item.nextAdjustmentDate,
          internalOwner: data.item.internalOwner,
          status: data.item.status,
          risk: data.item.risk,
          notes: data.item.notes,
        }}
        submitLabel="Salvar alteracoes"
        submitting={submitting}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/contracts/${id}`)}
      />
    </ContractsPageShell>
  );
}
