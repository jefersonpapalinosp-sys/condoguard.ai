export function EmptyState({ message = 'Nenhum dado disponível no momento.' }: { message?: string }) {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="bg-surface-container-high p-6 rounded-xl text-on-surface-variant">{message}</div>
    </div>
  );
}
