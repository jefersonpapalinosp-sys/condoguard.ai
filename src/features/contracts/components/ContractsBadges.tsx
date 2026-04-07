import type { ContractRisk, ContractStatus } from '../types/contracts';

const riskLabel: Record<ContractRisk, string> = {
  high: 'Alto',
  medium: 'Medio',
  low: 'Baixo',
};

const riskClass: Record<ContractRisk, string> = {
  high: 'bg-error-container text-on-error-container',
  medium: 'bg-secondary-container text-on-secondary-container',
  low: 'bg-tertiary-fixed-dim/30 text-on-tertiary-fixed-variant',
};

const statusLabel: Record<ContractStatus, string> = {
  active: 'Ativo',
  expiring: 'Vencendo',
  expired: 'Vencido',
  renewal_pending: 'Renovacao pendente',
  closed: 'Encerrado',
  draft: 'Rascunho',
};

const statusClass: Record<ContractStatus, string> = {
  active: 'bg-tertiary-fixed-dim/30 text-on-tertiary-fixed-variant',
  expiring: 'bg-secondary-container text-on-secondary-container',
  expired: 'bg-error-container text-on-error-container',
  renewal_pending: 'bg-primary-container text-on-primary-container',
  closed: 'bg-surface-container-highest text-on-surface-variant',
  draft: 'bg-surface-container-high text-on-surface-variant',
};

export function ContractRiskBadge({ risk }: { risk: ContractRisk }) {
  return <span className={`px-2 py-1 rounded text-xs font-bold ${riskClass[risk]}`}>{riskLabel[risk]}</span>;
}

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  return <span className={`px-2 py-1 rounded text-xs font-bold ${statusClass[status]}`}>{statusLabel[status]}</span>;
}
