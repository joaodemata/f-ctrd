import { useState } from 'react';
import { listConditions } from '../api/conditions';
import { useApiQuery } from '../hooks/useApiQuery';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import type { Condition } from '../models/condition';
import { formatDateTime, formatDuration } from '../utils/format';
import { ErrorBanner } from './ErrorBanner';
import { Pagination } from './Pagination';
import { StatusBadge } from './StatusBadge';

const DEFAULT_LIMIT = 10;

// Valores con los que se configuro el callback (ej: umbrales); nada si no tiene
function CallbackParametersList({ parameters }: { parameters: Condition['parametersCallback'] }) {
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
        <h2 id="conditions-title">Condiciones registradas</h2>
        <input
          type="search"
          placeholder="Buscar condicion"
          value={search}
          maxLength={100}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          aria-label="Buscar condicion"
        />
      </div>

      {list.error && <ErrorBanner error={list.error} onRetry={list.refetch} stale={!!list.data} />}

      <div className="panel" aria-busy={list.isLoading || list.isRefreshing}>
        {list.isLoading ? (
          <p className="empty">Cargando condiciones…</p>
        ) : (
          list.data &&
          (list.data.conditions.length === 0 ? (
            <p className="empty">No hay condiciones{debouncedSearch ? ' con esta busqueda' : ''}.</p>
          ) : (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Condicion</th>
                      <th scope="col">Tipo</th>
                      <th scope="col">Proveedor</th>
                      <th scope="col">Callback</th>
                      <th scope="col">Cada</th>
                      <th scope="col">Estado</th>
                      <th scope="col">Ultima evaluacion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.conditions.map((condition) => (
                      <tr key={condition.id} className="table__row" data-status={condition.tagStatus}>
                        <td>
                          <strong>{condition.name}</strong>
                          {condition.tag && <div className="muted small">{condition.tag}</div>}
                          {condition.description && <div className="muted small">{condition.description}</div>}
                        </td>
                        <td>{condition.nameTypeCondition || '—'}</td>
                        <td>{condition.nameProvider}</td>
                        <td>
                          <code className="small">{condition.callbackFunction}</code>
                          <CallbackParametersList parameters={condition.parametersCallback} />
                        </td>
                        <td>
                          {condition.isWebhookOnly
                            ? 'Webhook'
                            : condition.intervalSeconds
                              ? formatDuration(Math.round(condition.intervalSeconds / 60))
                              : '—'}
                        </td>
                        <td>
                          <StatusBadge tag={condition.tagStatus} label={condition.status || condition.tagStatus} />
                        </td>
                        <td>{formatDateTime(condition.lastExecutedAt)}</td>
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
