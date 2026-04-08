export function EmptyState({ message = 'Nenhum dado disponível no momento.' }: { message?: string }) {
  return (
    <div className="mx-auto w-full max-w-7xl p-4 md:p-8">
      <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-high p-5 md:p-6">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-on-surface-variant">inventory_2</span>
          <p className="text-sm text-on-surface-variant md:text-base">{message}</p>
        </div>
      </div>
    </div>
  );
}
