export function LoadingState({ message = 'Carregando dados...' }: { message?: string }) {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="bg-surface-container-low p-6 rounded-xl text-on-surface-variant">{message}</div>
    </div>
  );
}
