import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import type { ContractRisk, ContractStatus, ContractUpsertPayload } from '../types/contracts';

type Props = {
  initialValue?: Partial<ContractUpsertPayload>;
  submitting?: boolean;
  submitLabel: string;
  onSubmit: (payload: ContractUpsertPayload) => Promise<void> | void;
  onCancel?: () => void;
};

type FormState = ContractUpsertPayload;

function toInputDate(value: string | undefined) {
  if (!value) return '';
  return value.slice(0, 10);
}

export function ContractForm({ initialValue, submitting = false, submitLabel, onSubmit, onCancel }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    contractNumber: initialValue?.contractNumber ?? '',
    name: initialValue?.name ?? '',
    supplier: initialValue?.supplier ?? '',
    category: initialValue?.category ?? '',
    description: initialValue?.description ?? '',
    serviceType: initialValue?.serviceType ?? '',
    startDate: toInputDate(initialValue?.startDate) || '',
    endDate: toInputDate(initialValue?.endDate) || '',
    termMonths: initialValue?.termMonths ?? 12,
    monthlyValue: initialValue?.monthlyValue ?? 0,
    index: initialValue?.index ?? 'IPCA',
    adjustmentFrequencyMonths: initialValue?.adjustmentFrequencyMonths ?? 12,
    nextAdjustmentDate: toInputDate(initialValue?.nextAdjustmentDate) || '',
    internalOwner: initialValue?.internalOwner ?? '',
    status: initialValue?.status ?? 'active',
    risk: initialValue?.risk ?? 'low',
    notes: initialValue?.notes ?? '',
  });

  const minEndDate = useMemo(() => form.startDate || undefined, [form.startDate]);

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.supplier.trim() || !form.serviceType.trim()) {
      setError('Preencha nome, fornecedor e tipo de servico.');
      return;
    }
    if (!form.startDate || !form.endDate) {
      setError('Preencha data de inicio e data de termino.');
      return;
    }
    if (form.endDate < form.startDate) {
      setError('A data de termino deve ser maior ou igual a data de inicio.');
      return;
    }
    if (form.monthlyValue <= 0) {
      setError('Valor mensal deve ser maior que zero.');
      return;
    }
    if (!form.internalOwner.trim()) {
      setError('Informe o responsavel interno.');
      return;
    }

    await onSubmit({
      ...form,
      contractNumber: form.contractNumber.trim() || undefined,
      category: form.category.trim() || 'Servicos Gerais',
      description: form.description.trim(),
      notes: form.notes.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface-container-low rounded-xl p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Numero/Nome do contrato
          <input
            value={form.contractNumber}
            onChange={(event) => patch('contractNumber', event.target.value)}
            className="mt-2 w-full px-3 py-2 rounded-lg bg-surface-container-highest outline-none focus:ring-2 focus:ring-primary-fixed"
            placeholder="CTR-2026-001"
          />
        </label>

        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Nome do contrato
          <input
            value={form.name}
            onChange={(event) => patch('name', event.target.value)}
            className="mt-2 w-full px-3 py-2 rounded-lg bg-surface-container-highest outline-none focus:ring-2 focus:ring-primary-fixed"
            placeholder="Portaria e controle de acesso"
          />
        </label>

        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Fornecedor
          <input
            value={form.supplier}
            onChange={(event) => patch('supplier', event.target.value)}
            className="mt-2 w-full px-3 py-2 rounded-lg bg-surface-container-highest outline-none focus:ring-2 focus:ring-primary-fixed"
            placeholder="Sentinel Security Ltda"
          />
        </label>

        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Categoria
          <input
            value={form.category}
            onChange={(event) => patch('category', event.target.value)}
            className="mt-2 w-full px-3 py-2 rounded-lg bg-surface-container-highest outline-none focus:ring-2 focus:ring-primary-fixed"
            placeholder="Seguranca"
          />
        </label>

        <label className="md:col-span-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Descricao
          <input
            value={form.description}
            onChange={(event) => patch('description', event.target.value)}
            className="mt-2 w-full px-3 py-2 rounded-lg bg-surface-container-highest outline-none focus:ring-2 focus:ring-primary-fixed"
            placeholder="Descricao resumida do escopo contratual"
          />
        </label>

        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Tipo de servico
          <input
            value={form.serviceType}
            onChange={(event) => patch('serviceType', event.target.value)}
            className="mt-2 w-full px-3 py-2 rounded-lg bg-surface-container-highest outline-none focus:ring-2 focus:ring-primary-fixed"
            placeholder="Seguranca patrimonial"
          />
        </label>

        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Valor mensal (R$)
          <input
            type="number"
            min={0}
            step="0.01"
            value={form.monthlyValue}
            onChange={(event) => patch('monthlyValue', Number(event.target.value))}
            className="mt-2 w-full px-3 py-2 rounded-lg bg-surface-container-highest outline-none focus:ring-2 focus:ring-primary-fixed"
          />
        </label>

        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Data de inicio
          <input
            type="date"
            value={form.startDate}
            onChange={(event) => patch('startDate', event.target.value)}
            className="mt-2 w-full px-3 py-2 rounded-lg bg-surface-container-highest outline-none focus:ring-2 focus:ring-primary-fixed"
          />
        </label>

        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Data de termino
          <input
            type="date"
            min={minEndDate}
            value={form.endDate}
            onChange={(event) => patch('endDate', event.target.value)}
            className="mt-2 w-full px-3 py-2 rounded-lg bg-surface-container-highest outline-none focus:ring-2 focus:ring-primary-fixed"
          />
        </label>

        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Prazo (meses)
          <input
            type="number"
            min={1}
            max={240}
            value={form.termMonths ?? 12}
            onChange={(event) => patch('termMonths', Number(event.target.value))}
            className="mt-2 w-full px-3 py-2 rounded-lg bg-surface-container-highest outline-none focus:ring-2 focus:ring-primary-fixed"
          />
        </label>

        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Indice de reajuste
          <select
            value={form.index}
            onChange={(event) => patch('index', event.target.value as FormState['index'])}
            className="mt-2 w-full px-3 py-2 rounded-lg bg-surface-container-highest outline-none focus:ring-2 focus:ring-primary-fixed"
          >
            <option value="IPCA">IPCA</option>
            <option value="IGPM">IGPM</option>
            <option value="INPC">INPC</option>
            <option value="FIXO">FIXO</option>
          </select>
        </label>

        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Periodicidade do reajuste (meses)
          <input
            type="number"
            min={1}
            max={24}
            value={form.adjustmentFrequencyMonths}
            onChange={(event) => patch('adjustmentFrequencyMonths', Number(event.target.value))}
            className="mt-2 w-full px-3 py-2 rounded-lg bg-surface-container-highest outline-none focus:ring-2 focus:ring-primary-fixed"
          />
        </label>

        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Proximo reajuste
          <input
            type="date"
            value={form.nextAdjustmentDate || ''}
            onChange={(event) => patch('nextAdjustmentDate', event.target.value)}
            className="mt-2 w-full px-3 py-2 rounded-lg bg-surface-container-highest outline-none focus:ring-2 focus:ring-primary-fixed"
          />
        </label>

        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Responsavel interno
          <input
            value={form.internalOwner}
            onChange={(event) => patch('internalOwner', event.target.value)}
            className="mt-2 w-full px-3 py-2 rounded-lg bg-surface-container-highest outline-none focus:ring-2 focus:ring-primary-fixed"
            placeholder="Nome do responsavel"
          />
        </label>

        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Status
          <select
            value={form.status}
            onChange={(event) => patch('status', event.target.value as ContractStatus)}
            className="mt-2 w-full px-3 py-2 rounded-lg bg-surface-container-highest outline-none focus:ring-2 focus:ring-primary-fixed"
          >
            <option value="active">Ativo</option>
            <option value="expiring">Vencendo</option>
            <option value="renewal_pending">Renovacao pendente</option>
            <option value="expired">Vencido</option>
            <option value="closed">Encerrado</option>
            <option value="draft">Rascunho</option>
          </select>
        </label>

        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Risco
          <select
            value={form.risk}
            onChange={(event) => patch('risk', event.target.value as ContractRisk)}
            className="mt-2 w-full px-3 py-2 rounded-lg bg-surface-container-highest outline-none focus:ring-2 focus:ring-primary-fixed"
          >
            <option value="low">Baixo</option>
            <option value="medium">Medio</option>
            <option value="high">Alto</option>
          </select>
        </label>

        <label className="md:col-span-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Observacoes
          <textarea
            rows={4}
            value={form.notes}
            onChange={(event) => patch('notes', event.target.value)}
            className="mt-2 w-full px-3 py-2 rounded-lg bg-surface-container-highest outline-none focus:ring-2 focus:ring-primary-fixed resize-y"
            placeholder="Clausulas relevantes, pendencias e observacoes de auditoria"
          />
        </label>
      </div>

      {error ? <p className="text-sm text-error">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-lg monolith-gradient text-white text-xs font-bold uppercase tracking-widest disabled:opacity-50"
        >
          {submitting ? 'Salvando...' : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-surface-container-highest text-on-surface text-xs font-bold uppercase tracking-widest"
          >
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  );
}
