import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ContractsPageShell } from '../components/ContractsPageShell';
import { ContractForm } from '../components/ContractForm';
import { createContract } from '../services/contractsManagementService';
import type { ContractUpsertPayload } from '../types/contracts';

export default function ContractCreatePage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(payload: ContractUpsertPayload) {
    try {
      setSubmitting(true);
      const created = await createContract(payload);
      navigate(`/contracts/${created.id}`);
    } catch {
      setError('Nao foi possivel cadastrar o contrato no momento.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ContractsPageShell title="Novo contrato" subtitle="Cadastro completo de contrato com validacoes de dados e governanca.">
      {error ? <p className="text-sm text-error">{error}</p> : null}
      <ContractForm
        submitLabel="Salvar contrato"
        submitting={submitting}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/contracts/lista')}
      />
    </ContractsPageShell>
  );
}
