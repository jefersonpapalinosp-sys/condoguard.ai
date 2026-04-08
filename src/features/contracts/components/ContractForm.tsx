import type { FormEvent } from 'react';
import { useId, useMemo, useState } from 'react';
import type { ContractRisk, ContractStatus, ContractUpsertPayload } from '../types/contracts';

type Props = {
  initialValue?: Partial<ContractUpsertPayload>;
  submitting?: boolean;
  submitLabel: string;
  onSubmit: (payload: ContractUpsertPayload) => Promise<void> | void;
  onCancel?: () => void;
};

type FormState = ContractUpsertPayload;
const labelClass = 'text-[11px] font-bold uppercase tracking-widest text-on-surface-variant';
const inputClass =
  'mt-2 w-full rounded-xl border border-outline-variant/30 bg-surface-container-highest px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary-fixed';

function toInputDate(value: string | undefined) {
  if (!value) return '';
  return value.slice(0, 10);
}

export function ContractForm({ initialValue, submitting = false, submitLabel, onSubmit, onCancel }: Props) {
  const errorId = useId();
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
    <form
      onSubmit={handleSubmit}
      aria-busy={submitting}
      aria-describedby={error ? errorId : undefined}
      className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 md:p-6 space-y-5"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className={labelClass}>
          Numero/Nome do contrato
          <input
            value={form.contractNumber}
            onChange={(event) => patch('contractNumber', event.target.value)}
            className={inputClass}
            placeholder="CTR-2026-001"
          />
        </label>

        <label className={labelClass}>
          Nome do contrato
          <input
            required
            value={form.name}
            onChange={(event) => patch('name', event.target.value)}
            className={inputClass}
            placeholder="Portaria e controle de acesso"
          />
        </label>

        <label className={labelClass}>
          Fornecedor
          <input
            required
            value={form.supplier}
            onChange={(event) => patch('supplier', event.target.value)}
            className={inputClass}
            placeholder="Sentinel Security Ltda"
          />
        </label>

        <label className={labelClass}>
          Categoria
          <input
            value={form.category}
            onChange={(event) => patch('category', event.target.value)}
            className={inputClass}
            placeholder="Seguranca"
          />
        </label>

        <label className={`md:col-span-2 xl:col-span-3 ${labelClass}`}>
          Descricao
          <input
            value={form.description}
            onChange={(event) => patch('description', event.target.value)}
            className={inputClass}
            placeholder="Descricao resumida do escopo contratual"
          />
        </label>

        <label className={labelClass}>
          Tipo de servico
          <input
            required
            value={form.serviceType}
            onChange={(event) => patch('serviceType', event.target.value)}
            className={inputClass}
            placeholder="Seguranca patrimonial"
          />
        </label>

        <label className={labelClass}>
          Valor mensal (R$)
          <input
            type="number"
            min={0.01}
            step="0.01"
            required
            value={form.monthlyValue}
            onChange={(event) => patch('monthlyValue', Number(event.target.value))}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          Data de inicio
          <input
            type="date"
            required
            value={form.startDate}
            onChange={(event) => patch('startDate', event.target.value)}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          Data de termino
          <input
            type="date"
            min={minEndDate}
            required
            value={form.endDate}
            onChange={(event) => patch('endDate', event.target.value)}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          Prazo (meses)
          <input
            type="number"
            min={1}
            max={240}
            value={form.termMonths ?? 12}
            onChange={(event) => patch('termMonths', Number(event.target.value))}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          Indice de reajuste
          <select
            value={form.index}
            onChange={(event) => patch('index', event.target.value as FormState['index'])}
            className={inputClass}
          >
            <option value="IPCA">IPCA</option>
            <option value="IGPM">IGPM</option>
            <option value="INPC">INPC</option>
            <option value="FIXO">FIXO</option>
          </select>
        </label>

        <label className={labelClass}>
          Periodicidade do reajuste (meses)
          <input
            type="number"
            min={1}
            max={24}
            value={form.adjustmentFrequencyMonths}
            onChange={(event) => patch('adjustmentFrequencyMonths', Number(event.target.value))}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          Proximo reajuste
          <input
            type="date"
            value={form.nextAdjustmentDate || ''}
            onChange={(event) => patch('nextAdjustmentDate', event.target.value)}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          Responsavel interno
          <input
            required
            value={form.internalOwner}
            onChange={(event) => patch('internalOwner', event.target.value)}
            className={inputClass}
            placeholder="Nome do responsavel"
          />
        </label>

        <label className={labelClass}>
          Status
          <select
            value={form.status}
            onChange={(event) => patch('status', event.target.value as ContractStatus)}
            className={inputClass}
          >
            <option value="active">Ativo</option>
            <option value="expiring">Vencendo</option>
            <option value="renewal_pending">Renovacao pendente</option>
            <option value="expired">Vencido</option>
            <option value="closed">Encerrado</option>
            <option value="draft">Rascunho</option>
          </select>
        </label>

        <label className={labelClass}>
          Risco
          <select
            value={form.risk}
            onChange={(event) => patch('risk', event.target.value as ContractRisk)}
            className={inputClass}
          >
            <option value="low">Baixo</option>
            <option value="medium">Medio</option>
            <option value="high">Alto</option>
          </select>
        </label>

        <label className={`md:col-span-2 xl:col-span-3 ${labelClass}`}>
          Observacoes
          <textarea
            rows={4}
            value={form.notes}
            onChange={(event) => patch('notes', event.target.value)}
            className="mt-2 w-full rounded-xl border border-outline-variant/30 bg-surface-container-highest px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary-fixed resize-y"
            placeholder="Clausulas relevantes, pendencias e observacoes de auditoria"
          />
        </label>
      </div>

      {error ? (
        <p id={errorId} role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-outline-variant/30 pt-4">
        <button
          type="submit"
          disabled={submitting}
          className="interactive-focus px-4 py-2 rounded-lg monolith-gradient text-white text-xs font-bold uppercase tracking-widest disabled:opacity-50"
        >
          {submitting ? 'Salvando...' : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="interactive-focus px-4 py-2 rounded-lg bg-surface-container-highest text-on-surface text-xs font-bold uppercase tracking-widest"
          >
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  );
}
