import { ContractsPageShell } from './ContractsPageShell';

type ContractsLoadingSkeletonVariant = 'dashboard' | 'table' | 'details' | 'form';

type Props = {
  title: string;
  subtitle: string;
  message?: string;
  variant?: ContractsLoadingSkeletonVariant;
  withAction?: boolean;
};

function Pulse({ className, delayMs = 0 }: { className: string; delayMs?: number }) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton-wave animate-pulse rounded-xl bg-surface-container-high/85 ${className}`}
      style={delayMs > 0 ? { animationDelay: `${delayMs}ms` } : undefined}
    />
  );
}

function DashboardSkeletonBody() {
  return (
    <>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Pulse className="h-28" />
        <Pulse className="h-28" />
        <Pulse className="h-28" />
        <Pulse className="h-28" />
      </section>
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Pulse className="h-24" />
        <Pulse className="h-24" />
        <Pulse className="h-24" />
      </section>
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Pulse className="h-56" />
        <Pulse className="h-56" />
      </section>
    </>
  );
}

function TableSkeletonBody() {
  return (
    <>
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Pulse className="h-24" />
        <Pulse className="h-24" delayMs={70} />
        <Pulse className="h-24" delayMs={140} />
        <Pulse className="h-24" delayMs={210} />
      </section>

      <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 md:p-5">
        <Pulse className="h-5 w-64" />
        <Pulse className="mt-2 h-4 w-80 max-w-full" delayMs={50} />
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Pulse className="h-11" />
          <Pulse className="h-11" delayMs={40} />
          <Pulse className="h-11" delayMs={80} />
          <Pulse className="h-11" delayMs={120} />
          <Pulse className="h-11" delayMs={160} />
          <Pulse className="h-11" delayMs={200} />
          <Pulse className="h-11" delayMs={240} />
          <Pulse className="h-11" delayMs={280} />
        </div>
        <Pulse className="mt-4 h-14" delayMs={340} />
      </section>

      <section className="space-y-3 md:hidden">
        <Pulse className="h-56" />
        <Pulse className="h-56" delayMs={70} />
      </section>

      <section className="hidden rounded-2xl border border-outline-variant/30 bg-surface-container-low p-5 md:block">
        <Pulse className="h-9 w-full" />
        <div className="mt-3 space-y-2">
          <Pulse className="h-12 w-full" delayMs={35} />
          <Pulse className="h-12 w-full" delayMs={70} />
          <Pulse className="h-12 w-full" delayMs={105} />
          <Pulse className="h-12 w-full" delayMs={140} />
        </div>
      </section>

      <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4">
        <Pulse className="h-10 w-full" />
      </section>
    </>
  );
}

function DetailsSkeletonBody() {
  return (
    <>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Pulse className="h-28" />
        <Pulse className="h-28" />
        <Pulse className="h-28" />
        <Pulse className="h-28" />
      </section>
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Pulse className="h-64" />
        <Pulse className="h-64" />
      </section>
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Pulse className="h-60" />
        <Pulse className="h-60" />
      </section>
    </>
  );
}

function FormSkeletonBody() {
  return (
    <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 md:p-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Pulse className="h-16" />
        <Pulse className="h-16" />
        <Pulse className="h-16" />
        <Pulse className="h-16" />
        <Pulse className="h-16 md:col-span-2 xl:col-span-3" />
        <Pulse className="h-16" />
        <Pulse className="h-16" />
        <Pulse className="h-16" />
        <Pulse className="h-16" />
        <Pulse className="h-16" />
        <Pulse className="h-16" />
        <Pulse className="h-16" />
        <Pulse className="h-16" />
        <Pulse className="h-16" />
        <Pulse className="h-16" />
        <Pulse className="h-32 md:col-span-2 xl:col-span-3" />
      </div>
      <div className="mt-5 border-t border-outline-variant/30 pt-4">
        <Pulse className="h-10 w-52" />
      </div>
    </section>
  );
}

export function ContractsLoadingSkeleton({
  title,
  subtitle,
  message = 'Carregando dados do modulo de contratos...',
  variant = 'table',
  withAction = false,
}: Props) {
  const action = withAction ? <Pulse className="h-9 w-32 bg-white/20" /> : undefined;

  return (
    <ContractsPageShell title={title} subtitle={subtitle} actions={action}>
      <p role="status" aria-live="polite" className="sr-only">
        {message}
      </p>
      {variant === 'dashboard' ? <DashboardSkeletonBody /> : null}
      {variant === 'table' ? <TableSkeletonBody /> : null}
      {variant === 'details' ? <DetailsSkeletonBody /> : null}
      {variant === 'form' ? <FormSkeletonBody /> : null}
    </ContractsPageShell>
  );
}
