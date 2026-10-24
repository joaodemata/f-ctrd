interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

const LIMIT_OPTIONS = [10, 25, 50, 100];

export function Pagination({ page, limit, total, onPageChange, onLimitChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <nav className="pagination" aria-label="Paginacion">
      <span className="muted">
        {from}–{to} de {total}
      </span>
      <label className="pagination__limit">
        <span className="muted">Por pagina</span>
        <select value={limit} onChange={(event) => onLimitChange(Number(event.target.value))}>
          {LIMIT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <div className="pagination__buttons">
        <button type="button" className="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Anterior
        </button>
        <span>
          {page} / {totalPages}
        </span>
        <button
          type="button"
          className="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
        </button>
      </div>
    </nav>
  );
}
