export function ErrorState({ message = 'Não foi possível carregar os dados.' }: { message?: string }) {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="bg-error-container text-on-error-container p-6 rounded-xl">
        <p className="font-bold">Erro</p>
        <p className="text-sm mt-1">{message}</p>
      </div>
    </div>
  );
}
