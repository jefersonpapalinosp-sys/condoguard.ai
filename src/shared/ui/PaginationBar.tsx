type PaginationBarProps = {
  page: number;
  totalPages: number;
  total: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
};

export function PaginationBar({
  page,
  totalPages,
  total,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
}: PaginationBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3">
      <p className="text-xs font-semibold text-on-surface-variant">
        Pagina {page} de {totalPages} | Total: {total}
      </p>
      <div className="flex gap-2">
        <button
          onClick={onPrevious}
          disabled={!hasPrevious}
          className="rounded-lg bg-surface-container-highest px-3 py-2 text-xs font-bold disabled:opacity-50"
        >
          Anterior
        </button>
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-on-primary disabled:opacity-50"
        >
          Proxima
        </button>
      </div>
    </div>
  );
}
