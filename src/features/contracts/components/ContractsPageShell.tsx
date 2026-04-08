import { useId, type ReactNode } from 'react';
import { DataSourceBadge } from '../../../shared/ui/DataSourceBadge';
import { ContractsModuleNav } from './ContractsModuleNav';

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function ContractsPageShell({ title, subtitle, children, actions }: Props) {
  const titleId = useId();
  const contentId = useId();

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:space-y-8 md:p-8">
      <a
        href={`#${contentId}`}
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface-container-lowest focus:px-3 focus:py-2 focus:text-xs focus:font-bold focus:text-on-surface"
      >
        Pular para o conteudo principal de contratos
      </a>

      <section aria-labelledby={titleId} className="motion-fade-up rounded-3xl bg-[linear-gradient(130deg,#131b2e_0%,#1f3453_55%,#2d4a72_100%)] p-5 text-white shadow-xl md:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/75">Central de contratos</p>
            <h2 id={titleId} className="mt-2 font-headline text-2xl font-extrabold tracking-tight md:text-4xl">
              {title}
            </h2>
            <p className="mt-2 text-sm text-white/85 md:text-base">{subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <DataSourceBadge module="contracts" />
            {actions}
          </div>
        </div>
      </section>

      <section className="motion-fade-up motion-delay-1 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-3 md:p-4">
        <ContractsModuleNav />
      </section>

      <div id={contentId} tabIndex={-1} className="motion-fade-up motion-delay-2 space-y-4 md:space-y-6">
        {children}
      </div>
    </div>
  );
}
