import { useCallback, useState } from 'react';
import { listTriggers } from '../api/triggers';
import { useApiQuery } from '../hooks/useApiQuery';
import type { Trigger } from '../models/trigger';
import { ErrorBanner } from './ErrorBanner';
import { Filters, type FilterValues } from './Filters';
import { Pagination } from './Pagination';
import { TriggerEdit } from './TriggerEdit';
import { TriggersTable } from './TriggersTable';
import { t } from '../i18n/language';

const DEFAULT_LIMIT = 10;
const EMPTY_FILTERS: FilterValues = { search: '', startDate: '', endDate: '' };

export function TriggersPage() {
  const [filters, setFilters] = useState<FilterValues>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  // El listado se conserva mientras se edita para volver a la misma pagina y filtros
  const [editing, setEditing] = useState<Trigger | null>(null);

  const invalidRange = filters.startDate !== '' && filters.endDate !== '' && filters.startDate > filters.endDate;
  const dateRange = invalidRange ? {} : { startDate: filters.startDate, endDate: filters.endDate };
  // La busqueda es literal en C-TRD (nombre, tag, descripcion, asset, accion y estado): se envia tal cual
  const search = filters.search.trim();

  const list = useApiQuery(
    // Solo los activos; las versiones anteriores se ven en el detalle de versiones de cada trigger
    (signal) => listTriggers({ limit, page, search, ...dateRange }, signal),
    [limit, page, search, dateRange.startDate, dateRange.endDate],
  );

  const handleFilters = useCallback((next: FilterValues) => {
    setFilters(next);
    setPage(1);
  }, []);

  if (editing) {
    return (
      <main className="page page--narrow">
        <div className="page__head">
          <div>
            <h1>{t('Editar trigger', 'Edit trigger')}</h1>
            <p className="muted small">
              {editing.name} · <code>{editing.tag}</code>
            </p>
          </div>
        </div>
        <TriggerEdit
          trigger={editing}
          onClose={(updated) => {
            setEditing(null);
            if (updated) list.refetch();
          }}
        />
      </main>
    );
  }

  return (
    <main className="page">
      <div className="page__head">
        <div>
          <h1>Triggers</h1>
          <p className="muted small">
            {t(
              'Triggers activos. Despliega uno para ver su detalle, sus versiones o editarlo.',
              'Active triggers. Expand one to see its details and versions, or to edit it.',
            )}
          </p>
        </div>
        <div className="form-actions">
          <button type="button" className="button" onClick={list.refetch} disabled={list.isLoading || list.isRefreshing}>
            {list.isRefreshing ? t('Actualizando…', 'Refreshing…') : t('Actualizar', 'Refresh')}
          </button>
          <a className="button button--primary" href="#/triggers/nuevo">
            {t('Nuevo trigger', 'New trigger')}
          </a>
        </div>
      </div>

      <Filters value={filters} onChange={handleFilters} placeholder={t('Nombre, tag, descripcion, asset, accion o estado', 'Name, tag, description, asset, action or status')} />

      {list.error && <ErrorBanner error={list.error} onRetry={list.refetch} stale={!!list.data} />}

      <section className="panel" aria-busy={list.isLoading || list.isRefreshing}>
        {list.isLoading ? (
          <p className="empty">{t('Cargando triggers…', 'Loading triggers…')}</p>
        ) : (
          list.data && (
            <>
              <TriggersTable triggers={list.data.triggers} onEdit={setEditing} />
              <Pagination
                page={page}
                limit={limit}
                total={list.data.page}
                onPageChange={setPage}
                onLimitChange={(next) => {
                  setLimit(next);
                  setPage(1);
                }}
              />
            </>
          )
        )}
      </section>
    </main>
  );
}
