export type StatusVariant = 'error' | 'warning' | 'info' | 'success' | 'neutral';

const classMap: Record<StatusVariant, string> = {
  error: 'bg-error-container text-on-error-container',
  warning: 'bg-secondary-container text-on-secondary-container',
  info: 'bg-tertiary-fixed-dim/30 text-on-tertiary-fixed-variant',
  success: 'bg-tertiary-fixed-dim/30 text-on-tertiary-fixed-variant',
  neutral: 'bg-surface-container-highest text-on-surface-variant',
};

type StatusBadgeProps = {
  label: string;
  variant: StatusVariant;
  size?: 'xs' | 'sm';
};

export function StatusBadge({ label, variant, size = 'xs' }: StatusBadgeProps) {
  const sizeClass = size === 'xs' ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs';
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold uppercase tracking-widest ${sizeClass} ${classMap[variant]}`}
    >
      {label}
    </span>
  );
}

export function alertSeverityVariant(severity: 'critical' | 'warning' | 'info'): StatusVariant {
  const map = { critical: 'error', warning: 'warning', info: 'info' } as const;
  return map[severity];
}

export function invoiceStatusVariant(status: 'pending' | 'paid' | 'overdue'): StatusVariant {
  const map = { pending: 'neutral', paid: 'success', overdue: 'error' } as const;
  return map[status];
}

export function integrationStatusVariant(
  status: string | null | undefined,
): StatusVariant {
  if (!status) return 'neutral';
  const s = status.toLowerCase();
  if (s === 'completed') return 'success';
  if (s === 'completed_with_errors') return 'warning';
  if (s === 'failed') return 'error';
  if (s === 'running') return 'info';
  return 'neutral';
}
