import { useCallback, useState } from 'react';
import { pollIntervalMs } from '../api/config';
import { listOpportunities } from '../api/opportunities';
import type { ApiMeta, ApiResult } from '../api/types';
import { useApiQuery } from '../hooks/useApiQuery';
import { useAuth } from '../hooks/useAuth';
import { OPPORTUNITY_STATUSES, type OpportunityStatusInfo } from '../models/opportunity';
import { escapeRegex } from '../utils/format';
import { ErrorBanner } from './ErrorBanner';
import { Filters, type FilterValues } from './Filters';
import { OpportunitiesTable } from './OpportunitiesTable';
import { Pagination } from './Pagination';
import { StatusSummary } from './StatusSummary';

const DEFAULT_LIMIT = 10;
const EMPTY_FILTERS: FilterValues = { search: '', startDate: '', endDate: '' };

type StatusCounts = Partial<Record<string, number>>;

export function Dashboard() {
  const [filters, setFilters] = useState<FilterValues>(EMPTY_FILTERS);
  const [status, setStatus] = useState<OpportunityStatusInfo | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  const invalidRange = filters.startDate !== '' && filters.endDate !== '' && filters.startDate > filters.endDate;
  const dateRange = invalidRange ? {} : { startDate: filters.startDate, endDate: filters.endDate };

  // El backend solo tiene un search (regex sobre asset, action, status y tag_trigger): el filtro
  // por estado usa el nombre del estado y tiene prioridad sobre el texto libre
  const search = status ? `^${escapeRegex(status.name)}$` : escapeRegex(filters.search.trim());

  // C-TRD filtra por visibilidad segun la sesion: sin sesion solo las publicas; con sesion tambien las del usuario y
  // las de lista privada donde esta. Al iniciar o cerrar sesion se vuelve a pedir; el estado cuenta porque un token
  // vencido falla la primera consulta (401) y la sesion pasa de 'checking' a 'anonymous' sin haber tenido usuario
  const auth = useAuth();
  const sessionKey = auth.user?.id ?? auth.status;

  const list = useApiQuery(
    (signal) => listOpportunities({ limit, page, search, ...dateRange }, signal),
    [limit, page, search, dateRange.startDate, dateRange.endDate, sessionKey],
    { pollIntervalMs },
  );

  // Totales por estado: una consulta con limit=1 por estado, usando solo el campo page (total)
  const counts = useApiQuery(
    async (signal): Promise<ApiResult<StatusCounts>> => {
      const results = await Promise.all(
        OPPORTUNITY_STATUSES.map(async (info) => ({
          tag: info.tag,
          result: await listOpportunities({ limit: 1, search: `^${escapeRegex(info.name)}$`, ...dateRange }, signal),
        })),
      );
      const totals: StatusCounts = {};
      let meta: ApiMeta = { httpStatus: 200, message: 'Totales por estado', tracking: '', date: new Date().toISOString() };
      for (const { tag, result } of results) {
        if (!result.ok) return result;
        totals[tag] = result.data.page;
        meta = result.meta;
      }
      return { ok: true, data: totals, meta };
    },
    [dateRange.startDate, dateRange.endDate, sessionKey],
    { pollIntervalMs },
  );

  const allTotal = counts.data
    ? OPPORTUNITY_STATUSES.reduce((sum, info) => sum + (counts.data?.[info.tag] ?? 0), 0)
    : undefined;

  const handleFilters = useCallback((next: FilterValues) => {
    setFilters(next);
    if (next.search !== '') setStatus(null);
    setPage(1);
  }, []);

  const handleStatus = (next: OpportunityStatusInfo | null) => {
    setStatus(next);
    setPage(1);
  };

  const refreshAll = () => {
    list.refetch();
    counts.refetch();
  };

  return (
    <main className="dashboard">
      <div className="dashboard__head">
        <div>
          <h1>Oportunidades</h1>
          <p className="muted small">
            {list.lastUpdated ? `Actualizado ${list.lastUpdated.toLocaleTimeString('es')}` : 'Cargando…'}
            {pollIntervalMs > 0 && ` · refresco cada ${Math.round(pollIntervalMs / 1000)}s`}
          </p>
          <p className="muted small">Todos los precios estan expresados en USD.</p>
          {auth.status === 'anonymous' && (
            <p className="muted small">
              Sin sesion solo ves las oportunidades publicas. <a href="#/login">Inicia sesion</a> para ver tambien las
              tuyas y las compartidas contigo.
            </p>
          )}
        </div>
        <button type="button" className="button" onClick={refreshAll} disabled={list.isLoading || list.isRefreshing}>
          {list.isRefreshing ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      <StatusSummary counts={counts.data} total={allTotal} selected={status?.tag ?? null} onSelect={handleStatus} />
      {counts.error && !list.error && <ErrorBanner error={counts.error} onRetry={counts.refetch} stale={!!counts.data} />}

      <Filters value={filters} onChange={handleFilters} />
      {status && (
        <p className="muted small">
          Filtrando por estado <strong>{status.name}</strong>; el texto de busqueda se ignora mientras el estado este
          seleccionado.
        </p>
      )}

      {list.error && <ErrorBanner error={list.error} onRetry={list.refetch} stale={!!list.data} />}

      <section className="panel" aria-busy={list.isLoading || list.isRefreshing}>
        {list.isLoading ? (
          <p className="empty">Cargando oportunidades…</p>
        ) : (
          list.data && (
            <>
              <OpportunitiesTable opportunities={list.data.opportunities} />
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
