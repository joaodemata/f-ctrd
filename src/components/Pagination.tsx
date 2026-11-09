import { t } from '../i18n/language';
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
    <nav className="pagination" aria-label={t('Paginacion', 'Pagination')}>
      <span className="muted">
        {from}–{to} {t('de', 'of')} {total}
      </span>
      <label className="pagination__limit">
        <span className="muted">{t('Por pagina', 'Per page')}</span>
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
          {t('Anterior', 'Previous')}
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
          {t('Siguiente', 'Next')}
        </button>
      </div>
    </nav>
  );
}
