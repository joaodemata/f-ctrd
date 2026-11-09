import { useState } from 'react';
import { listConditions } from '../api/conditions';
import { useApiQuery } from '../hooks/useApiQuery';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import type { Condition } from '../models/condition';
import { formatDateTime, formatDuration } from '../utils/format';
import { ErrorBanner } from './ErrorBanner';
import { Pagination } from './Pagination';
import { StatusBadge } from './StatusBadge';
import { t } from '../i18n/language';

const DEFAULT_LIMIT = 10;

// Valores con los que se configuro el callback (ej: umbrales); nada si no tiene
export function CallbackParametersList({ parameters }: { parameters: Condition['parametersCallback'] }) {
  const entries = Object.entries(parameters ?? {});
  if (entries.length === 0) return null;
  return (
    <div className="muted small">
      {entries.map(([name, value]) => (
        <div key={name}>
          {name}: <code>{String(value)}</code>
        </div>
      ))}
    </div>
  );
}

// Listado paginado de condiciones registradas. `refreshKey` cambia cuando se crea una condicion nueva
export function ConditionsTable({ refreshKey }: { refreshKey: number }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const debouncedSearch = useDebouncedValue(search.trim());

  const list = useApiQuery(
    (signal) => listConditions({ limit, page, search: debouncedSearch }, signal),
    [limit, page, debouncedSearch, refreshKey],
  );

  return (
    <section className="stack" aria-labelledby="conditions-title">
      <div className="page__head">
        <h2 id="conditions-title">{t('Condiciones registradas', 'Registered conditions')}</h2>
        <input
          type="search"
          placeholder={t('Buscar condicion', 'Search condition')}
          value={search}
          maxLength={100}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          aria-label={t('Buscar condicion', 'Search condition')}
        />
      </div>

      {list.error && <ErrorBanner error={list.error} onRetry={list.refetch} stale={!!list.data} />}

      <div className="panel" aria-busy={list.isLoading || list.isRefreshing}>
        {list.isLoading ? (
          <p className="empty">{t('Cargando condiciones…', 'Loading conditions…')}</p>
        ) : (
          list.data &&
          (list.data.conditions.length === 0 ? (
            <p className="empty">
              {debouncedSearch
                ? t('No hay condiciones con esta busqueda.', 'No conditions match this search.')
                : t('No hay condiciones.', 'There are no conditions.')}
            </p>
          ) : (
            <>
              <div className="table-wrap">
                <table className="table table--cards">
                  <thead>
                    <tr>
                      <th scope="col">{t('Condicion', 'Condition')}</th>
                      <th scope="col">{t('Tipo', 'Type')}</th>
                      <th scope="col">{t('Proveedor', 'Provider')}</th>
                      <th scope="col">Callback</th>
                      <th scope="col">{t('Cada', 'Every')}</th>
                      <th scope="col">{t('Estado', 'Status')}</th>
                      <th scope="col">{t('Ultima evaluacion', 'Last evaluation')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.conditions.map((condition) => (
                      <tr key={condition.id} className="table__row" data-status={condition.tagStatus}>
                        <td className="cell--main">
                          <strong>{condition.name}</strong>
                          {condition.tag && <div className="muted small">{condition.tag}</div>}
                          {condition.description && <div className="muted small">{condition.description}</div>}
                        </td>
                        <td data-label={t('Tipo', 'Type')}>{condition.nameTypeCondition || '—'}</td>
                        <td data-label={t('Proveedor', 'Provider')}>{condition.nameProvider}</td>
                        <td data-label="Callback">
                          <code className="small">{condition.callbackFunction}</code>
                          <CallbackParametersList parameters={condition.parametersCallback} />
                        </td>
                        <td data-label={t('Cada', 'Every')}>
                          {condition.isWebhookOnly
                            ? 'Webhook'
                            : condition.intervalSeconds
                              ? formatDuration(Math.round(condition.intervalSeconds / 60))
                              : '—'}
                        </td>
                        <td data-label={t('Estado', 'Status')}>
                          <StatusBadge tag={condition.tagStatus} label={condition.status || condition.tagStatus} />
                        </td>
                        <td data-label={t('Ultima evaluacion', 'Last evaluation')}>{formatDateTime(condition.lastExecutedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
          ))
        )}
      </div>
    </section>
  );
}
