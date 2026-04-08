export function ErrorState({ message = 'Não foi possível carregar os dados.' }: { message?: string }) {
  return (
    <div className="mx-auto w-full max-w-7xl p-4 md:p-8">
      <div className="rounded-2xl border border-error/35 bg-error-container p-5 text-on-error-container md:p-6">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined">error</span>
          <div>
            <p className="font-bold">Erro</p>
            <p className="mt-1 text-sm md:text-base">{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
