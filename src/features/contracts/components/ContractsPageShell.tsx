import type { ReactNode } from 'react';
import { DataSourceBadge } from '../../../shared/ui/DataSourceBadge';
import { ContractsModuleNav } from './ContractsModuleNav';

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function ContractsPageShell({ title, subtitle, children, actions }: Props) {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-headline text-2xl md:text-4xl font-extrabold tracking-tight">{title}</h2>
          <p className="text-on-surface-variant mt-2">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <DataSourceBadge module="contracts" />
          {actions}
        </div>
      </section>

      <ContractsModuleNav />

      {children}
    </div>
  );
}
