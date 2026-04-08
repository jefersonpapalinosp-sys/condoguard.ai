import { ContractsPageShell } from './ContractsPageShell';

type ContractsLoadingSkeletonVariant = 'dashboard' | 'table' | 'details' | 'form';

type Props = {
  title: string;
  subtitle: string;
  message?: string;
  variant?: ContractsLoadingSkeletonVariant;
  withAction?: boolean;
};

function Pulse({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-xl bg-surface-container-high ${className}`} />;
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
      <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 md:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Pulse className="h-11" />
          <Pulse className="h-11" />
          <Pulse className="h-11" />
          <Pulse className="h-11" />
          <Pulse className="h-11" />
          <Pulse className="h-11" />
          <Pulse className="h-11" />
          <Pulse className="h-11" />
        </div>
      </section>

      <section className="space-y-3 md:hidden">
        <Pulse className="h-52" />
        <Pulse className="h-52" />
      </section>

      <section className="hidden rounded-2xl border border-outline-variant/30 bg-surface-container-low p-5 md:block">
        <Pulse className="h-9 w-full" />
        <div className="mt-3 space-y-2">
          <Pulse className="h-12 w-full" />
          <Pulse className="h-12 w-full" />
          <Pulse className="h-12 w-full" />
          <Pulse className="h-12 w-full" />
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
